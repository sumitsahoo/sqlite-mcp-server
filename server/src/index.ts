import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { runNLQuery } from "./agent.js";
import db from "./db.js";

const app = express();
app.use(cors());

// Global map to keep track of active SSE transports
const transports = new Map<string, SSEServerTransport>();

function createMcpServer() {
  const server = new McpServer({
    name: "sqlite-mcp-server",
    version: "1.0.0",
  });

  // Register tools
  server.registerTool(
    "list_tables",
    {
      description: "Lists all tables in the SQLite database",
    },
    async () => {
      const tables = db
        .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
        .all();
      return {
        content: [{ type: "text", text: JSON.stringify(tables, null, 2) }],
      };
    },
  );

  server.registerTool(
    "get_schema",
    {
      description: "Gets the schema (CREATE statement and columns) for a specific table",
      inputSchema: {
        tableName: z.string().describe("The name of the table to get the schema for"),
      },
    },
    async ({ tableName }) => {
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
            type: "text",
            text: JSON.stringify({ createStatement: tableInfo.sql, columns }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    "read_query",
    {
      description: "Executes a read-only SELECT query against the SQLite database",
      inputSchema: {
        query: z.string().describe("The SQL SELECT query to execute"),
      },
    },
    async ({ query }) => {
      // Extremely basic safety check, actual robust implementations should use read-only connections
      if (!query.trim().toLowerCase().startsWith("select")) {
        throw new Error("Only SELECT queries are allowed for safety.");
      }

      const results = db.prepare(query).all();

      return {
        content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
      };
    },
  );

  return server;
}

// Server-Sent Events (SSE) endpoint for clients to connect
app.get("/sse", async (_req, res) => {
  console.log("New SSE connection initiated");

  // Create a new transport and server for this specific connection
  const transport = new SSEServerTransport("/message", res);
  const server = createMcpServer();

  await server.connect(transport);

  if (transport.sessionId) {
    transports.set(transport.sessionId, transport);
    console.log(`Stored transport with sessionId: ${transport.sessionId}`);
  }

  res.on("close", () => {
    console.log(`SSE connection closed for sessionId: ${transport.sessionId}`);
    if (transport.sessionId) {
      transports.delete(transport.sessionId);
    }
  });
});

// JSON-RPC message passing endpoint
// NOTE: Do NOT apply express.json() here — the MCP SDK's SSEServerTransport
// needs to read the raw request stream itself.
app.post("/message", async (req, res) => {
  const sessionId = req.query.sessionId as string;

  if (!sessionId) {
    res.status(400).send("Missing sessionId");
    return;
  }

  const transport = transports.get(sessionId);
  if (!transport) {
    res.status(404).send("Session not found");
    return;
  }

  await transport.handlePostMessage(req, res);
});

// Endpoint for Natural Language Queries via LangGraph
// express.json() is scoped only to this route so it doesn't interfere with /message
app.post("/api/nl-query", express.json(), async (req, res) => {
  try {
    const { query } = req.body;
    if (!query) {
      res.status(400).json({ error: "Missing 'query' in request body." });
      return;
    }
    const result = await runNLQuery(query);
    res.json(result);
  } catch (err: unknown) {
    console.error(err);
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`SQLite MCP Server running on SSE at http://localhost:${PORT}/sse`);
});
