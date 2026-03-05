import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import cors from "cors";
import express from "express";
import { z } from "zod";
import { runNLQuery } from "./agent.js";
import db from "./db.js";

// --- MCP Server (stdio) ---

const server = new McpServer({
  name: "sqlite-mcp-server",
  version: "1.0.0",
});

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

async function startMcpServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Server running on stdio");
}

startMcpServer().catch((error) => {
  console.error("Fatal error starting MCP server:", error);
  process.exit(1);
});

// --- Express API (HTTP) for the web client ---

const app = express();
app.use(cors());
app.use(express.json());

// REST endpoints for the web client (mirrors MCP tools)
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
