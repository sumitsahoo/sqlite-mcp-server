import { useCallback, useState } from "react";

const API_BASE = "http://localhost:3001";

// Hook to manage API connection and tool calls
export function useMcp() {
  const [error, setError] = useState<string | null>(null);

  const callTool = useCallback(async (toolName: string, args: Record<string, unknown> = {}) => {
    try {
      let res: Response;

      if (toolName === "list_tables") {
        res = await fetch(`${API_BASE}/api/tables`);
      } else if (toolName === "get_schema") {
        const tableName = args.tableName as string;
        res = await fetch(`${API_BASE}/api/schema/${encodeURIComponent(tableName)}`);
      } else if (toolName === "read_query") {
        res = await fetch(`${API_BASE}/api/query`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: args.query }),
        });
      } else {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || `HTTP ${res.status}`);
      }

      return await res.json();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      throw err;
    }
  }, []);

  // Always "connected" since we're using plain REST
  return { isConnected: true, error, callTool };
}
