import express from 'express';
import cors from 'cors';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import db from './db.js';
import { runNLQuery } from './agent.js';

const app = express();
app.use(cors());

// Global variable to keep track of the current active SSE transport
let transport: SSEServerTransport | null = null;

// Initialize MCP Server
const server = new Server(
    {
        name: 'sqlite-mcp-server',
        version: '1.0.0',
    },
    {
        capabilities: {
            tools: {},
        },
    }
);

// Define tools configuration
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: 'list_tables',
                description: 'Lists all tables in the SQLite database',
                inputSchema: {
                    type: 'object',
                    properties: {},
                },
            },
            {
                name: 'get_schema',
                description: 'Gets the schema (CREATE statement and columns) for a specific table',
                inputSchema: {
                    type: 'object',
                    properties: {
                        tableName: {
                            type: 'string',
                            description: 'The name of the table to get the schema for',
                        },
                    },
                    required: ['tableName'],
                },
            },
            {
                name: 'read_query',
                description: 'Executes a read-only SELECT query against the SQLite database',
                inputSchema: {
                    type: 'object',
                    properties: {
                        query: {
                            type: 'string',
                            description: 'The SQL SELECT query to execute',
                        },
                    },
                    required: ['query'],
                },
            },
        ],
    };
});

// Implement tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        if (name === 'list_tables') {
            const tables = db
                .prepare(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
                )
                .all();
            return {
                content: [{ type: 'text', text: JSON.stringify(tables, null, 2) }],
            };
        }

        else if (name === 'get_schema') {
            const { tableName } = args as { tableName: string };

            if (!tableName) {
                throw new Error('tableName is required');
            }

            // Get the CREATE statement
            const tableInfo = db
                .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?")
                .get(tableName) as { sql: string } | undefined;

            if (!tableInfo) {
                throw new Error(`Table not found: ${tableName}`);
            }

            // Get Pragma info for detailed typing
            const columns = db.pragma(`table_info(${tableName})`);

            return {
                content: [
                    {
                        type: 'text',
                        text: JSON.stringify({ createStatement: tableInfo.sql, columns }, null, 2),
                    },
                ],
            };
        }

        else if (name === 'read_query') {
            const { query } = args as { query: string };

            if (!query) {
                throw new Error('query is required');
            }

            // Extremely basic safety check, actual robust implementations should use read-only connections
            if (!query.trim().toLowerCase().startsWith('select')) {
                throw new Error('Only SELECT queries are allowed for safety.');
            }

            const results = db.prepare(query).all();

            return {
                content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
            };
        }

        throw new Error(`Unknown tool: ${name}`);
    } catch (error) {
        return {
            isError: true,
            content: [{ type: 'text', text: String(error) }],
        };
    }
});

// Server-Sent Events (SSE) endpoint for clients to connect
app.get('/sse', async (req, res) => {
    console.log('New SSE connection initiated');
    transport = new SSEServerTransport('/message', res);
    await server.connect(transport);

    res.on('close', () => {
        console.log('SSE connection closed');
        transport = null;
    });
});

app.use(express.json());

// JSON-RPC message passing endpoint
app.post('/message', async (req, res) => {
    if (!transport) {
        res.status(400).send('No active SSE connection');
        return;
    }
    await transport.handlePostMessage(req, res);
});

// Endpoint for Natural Language Queries via LangGraph
app.post('/api/nl-query', async (req, res) => {
    try {
        const { query } = req.body;
        if (!query) {
            res.status(400).json({ error: "Missing 'query' in request body." });
            return;
        }
        const result = await runNLQuery(query);
        res.json(result);
    } catch (err: any) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`SQLite MCP Server running on SSE at http://localhost:${PORT}/sse`);
});
