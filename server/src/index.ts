import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { runNLQuery } from "./agent.js";
import db from "./db.js";

// =============================================================================
// MCP Server (stdio transport)
// =============================================================================
// This section sets up the MCP (Model Context Protocol) server that communicates
// over stdio. MCP hosts like Claude Desktop, VS Code, or other compatible
// clients can launch this process and interact with the registered tools via
// JSON-RPC messages over stdin/stdout.

const server = new McpServer({
  name: "sqlite-mcp-server",
  version: "1.0.0",
});

// --- Tool: list_tables ---
// Returns all user-created tables in the SQLite database.
// System tables (prefixed with "sqlite_") are excluded.
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

// --- Tool: get_schema ---
// Returns the CREATE TABLE statement and column metadata (via PRAGMA table_info)
// for a given table. Useful for understanding table structure before querying.
server.registerTool(
  "get_schema",
  {
    description: "Gets the schema (CREATE statement and columns) for a specific table",
    inputSchema: {
      tableName: z.string().describe("The name of the table to get the schema for"),
    },
  },
  async ({ tableName }) => {
    const tableInfo = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?")
      .get(tableName) as { sql: string } | undefined;

    if (!tableInfo) {
      throw new Error(`Table not found: ${tableName}`);
    }

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

// --- Tool: read_query ---
// Executes a read-only SQL query. Only SELECT statements are permitted to
// prevent accidental or malicious data modification through the MCP interface.
server.registerTool(
  "read_query",
  {
    description: "Executes a read-only SELECT query against the SQLite database",
    inputSchema: {
      query: z.string().describe("The SQL SELECT query to execute"),
    },
  },
  async ({ query }) => {
    if (!query.trim().toLowerCase().startsWith("select")) {
      throw new Error("Only SELECT queries are allowed for safety.");
    }

    const results = db.prepare(query).all();

    return {
      content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
    };
  },
);

// Start the MCP server with a stdio transport. The StdioServerTransport reads
// JSON-RPC requests from stdin and writes responses to stdout. All logging uses
// console.error (stderr) to avoid corrupting the protocol stream on stdout.
async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

startMcpServer().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});

// =============================================================================
// Express REST API (HTTP) for the web client
// =============================================================================
// The web client (React frontend) cannot communicate over stdio, so we expose
// the same database operations as REST endpoints over HTTP. This runs alongside
// the MCP server in the same process, sharing the same SQLite database instance.

const app = express();
app.use(cors());
app.use(express.json());

// GET /api/tables — Lists all user-created tables (mirrors MCP "list_tables" tool)
app.get("/api/tables", (_req, res) => {
  try {
    const tables = db
      .prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'")
      .all();
    res.json(tables);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// GET /api/schema/:tableName — Returns the schema for a table (mirrors MCP "get_schema" tool)
app.get("/api/schema/:tableName", (req, res) => {
  try {
    const { tableName } = req.params;

    const tableInfo = db
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?")
      .get(tableName) as { sql: string } | undefined;

    if (!tableInfo) {
      res.status(404).json({ error: `Table not found: ${tableName}` });
      return;
    }

    const columns = db.pragma(`table_info(${tableName})`);
    res.json({ createStatement: tableInfo.sql, columns });
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/query — Executes a read-only SELECT query (mirrors MCP "read_query" tool)
app.post("/api/query", (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      res.status(400).json({ error: "Missing 'query' in request body." });
      return;
    }

    if (!query.trim().toLowerCase().startsWith("select")) {
      res.status(400).json({ error: "Only SELECT queries are allowed for safety." });
      return;
    }

    const results = db.prepare(query).all();
    res.json(results);
  } catch (err: unknown) {
    res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
  }
});

// POST /api/nl-query — Accepts a natural language question, uses LangGraph to
// convert it into SQL, executes it, and returns the results along with the
// generated SQL and reasoning.
app.post("/api/nl-query", async (req, res) => {
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
  console.error(`Express API running at http://localhost:${PORT}`);
});
