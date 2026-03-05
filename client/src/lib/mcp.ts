import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { useEffect, useState, useCallback } from "react";

// Hook to manage MCP connection and API calls
export function useMcp() {
    const [client, setClient] = useState<Client | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mcpClient: Client | null = null;

        const connect = async () => {
            try {
                const transport = new SSEClientTransport(
                    new URL("http://localhost:3001/sse")
                );

                mcpClient = new Client(
                    { name: "sqlite-mcp-client", version: "1.0.0" },
                    { capabilities: {} }
                );

                await mcpClient.connect(transport);
                setClient(mcpClient);
                setIsConnected(true);
                setError(null);
            } catch (err: any) {
                console.error("Failed to connect to MCP Server", err);
                setError(err.message || "Failed to connect to server.");
                setIsConnected(false);
            }
        };

        connect();

        // Cleanup on unmount
        return () => {
            if (mcpClient) {
                mcpClient.close().catch(console.error);
            }
        };
    }, []);

    // Generic tool caller
    const callTool = useCallback(
        async (toolName: string, args: Record<string, any> = {}) => {
            if (!client || !isConnected) {
                throw new Error("MCP Client is not connected");
            }
            try {
                const result = await client.callTool({
                    name: toolName,
                    arguments: args,
                });

                // Parse JSON content if it exists
                if (result.content && result.content.length > 0) {
                    const textContent = result.content[0] as { type: "text"; text: string };
                    if (textContent && textContent.text) {
                        return JSON.parse(textContent.text);
                    }
                }
                return null;
            } catch (error: any) {
                console.error(`Error calling tool ${toolName}:`, error);
                throw error;
            }
        },
        [client, isConnected]
    );

    return { isConnected, error, callTool };
}
