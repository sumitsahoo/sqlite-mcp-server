import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { tool } from "@langchain/core/tools";
import { z } from "zod";
import db from "./db.js";
import dotenv from "dotenv";

dotenv.config();

// Tool: List Tables
const listTablesTool = tool(
    async () => {
        const tables = db
            .prepare(
                "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
            )
            .all();
        return JSON.stringify(tables, null, 2);
    },
    {
        name: "list_tables",
        description: "Lists all tables in the SQLite database.",
        schema: z.object({}),
    }
);

// Tool: Get Schema
const getSchemaTool = tool(
    async ({ tableName }) => {
        const tableInfo = db
            .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?")
            .get(tableName) as { sql: string } | undefined;

        if (!tableInfo) {
            return `Table not found: ${tableName}`;
        }

        const columns = db.pragma(`table_info(${tableName})`);
        return JSON.stringify({ createStatement: tableInfo.sql, columns }, null, 2);
    },
    {
        name: "get_schema",
        description: "Gets the schema (CREATE statement and columns) for a specific table.",
        schema: z.object({
            tableName: z.string().describe("The name of the table to get the schema for"),
        }),
    }
);

// Tool: Read Query
const readQueryTool = tool(
    async ({ query }) => {
        if (!query.trim().toLowerCase().startsWith("select")) {
            return "Error: Only SELECT queries are allowed for safety.";
        }
        try {
            const results = db.prepare(query).all();
            return JSON.stringify(results, null, 2);
        } catch (e: any) {
            return `Error executing query: ${e.message}`;
        }
    },
    {
        name: "read_query",
        description: "Executes a read-only SELECT query against the SQLite database.",
        schema: z.object({
            query: z.string().describe("The SQL SELECT query to execute"),
        }),
    }
);

const tools = [listTablesTool, getSchemaTool, readQueryTool];

const llm = new ChatOpenAI({
    modelName: "gpt-4o",
    temperature: 0,
});

const systemMessage = `You are a specialized database assistant. Your goal is to translate the user's natural language question into an SQLite query, execute it, and return the results.
You MUST follow this process:
1. Examine the available tables using list_tables if you aren't sure what tables exist.
2. Check the schema for relevant tables using get_schema.
3. Execute the SQL query using read_query to get the data. Avoid LIMIT unless requested.
4. IMPORTANT: Your final response MUST be a pure, raw JSON object (with NO markdown formatting, NO backticks, and NO markdown code block tags) containing exactly these three keys:
{
  "thought": "A brief explanation of the query you chose and why.",
  "generated_sql": "The exact SQL query you successfully ran.",
  "results": [the JSON array of data results retrieved from read_query]
}
If there is an error during execution or you cannot find data, try fixing the query. If you absolutely cannot answer the query, "results" should be [] and "thought" should explain the failure.`;

export const agent = createReactAgent({
    llm,
    tools,
    stateModifier: systemMessage,
});

export async function runNLQuery(userQuery: string) {
    try {
        const response = await agent.invoke({
            messages: [{ role: "user", content: userQuery }],
        });

        const finalAgentMessage = response.messages[response.messages.length - 1];
        let contentStr = typeof finalAgentMessage.content === "string"
            ? finalAgentMessage.content
            : JSON.stringify(finalAgentMessage.content);

        // Strip markdown JSON wrapping if the LLM adds it despite instructions
        contentStr = contentStr.trim();
        if (contentStr.startsWith("\`\`\`json")) {
            contentStr = contentStr.replace(/^\`\`\`json/, "");
        } else if (contentStr.startsWith("\`\`\`")) {
            contentStr = contentStr.replace(/^\`\`\`/, "");
        }
        if (contentStr.endsWith("\`\`\`")) {
            contentStr = contentStr.replace(/\`\`\`$/, "");
        }

        const parsed = JSON.parse(contentStr.trim());
        return parsed;
    } catch (err: any) {
        console.error("NL LangGraph Error:", err);
        throw new Error(`Agent execution failed: ${err.message}`);
    }
}
