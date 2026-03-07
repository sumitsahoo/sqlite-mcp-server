import {
  Database,
  DatabaseZap,
  Loader2,
  MessageSquare,
  Play,
  Sparkles,
  Table,
  Terminal,
} from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { useMcp } from "./lib/mcp";

type TableInfo = { name: string };
type SchemaInfo = { createStatement: string; columns: Record<string, unknown>[] };

function App() {
  const { isConnected, error, callTool } = useMcp();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaInfo | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"sql" | "nl">("sql");

  // Raw SQL State
  const [query, setQuery] = useState("");
  const [queryResults, setQueryResults] = useState<Record<string, unknown>[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // NL Query State
  const [nlQuery, setNlQuery] = useState("");
  const [nlResult, setNlResult] = useState<{
    thought?: string;
    generated_sql?: string;
    results?: Record<string, unknown>[];
  } | null>(null);
  const [isNlExecuting, setIsNlExecuting] = useState(false);
  const [nlError, setNlError] = useState<string | null>(null);

  // Fetch tables when connected
  useEffect(() => {
    if (isConnected) {
      callTool("list_tables")
        .then((data) => {
          if (Array.isArray(data)) {
            setTables(data);
          }
        })
        .catch(console.error);
    }
  }, [isConnected, callTool]);

  // Handle table selection to view schema
  const handleSelectTable = async (tableName: string) => {
    setSelectedTable(tableName);
    setQuery(`SELECT * FROM ${tableName} LIMIT 50;`);
    setQueryResults(null);
    setQueryError(null);

    try {
      const data = await callTool("get_schema", { tableName });
      if (data) setSchema(data);
    } catch (err: unknown) {
      console.error(err);
    }
  };

  // Handle raw query execution
  const handleExecuteQuery = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsExecuting(true);
    setQueryError(null);

    try {
      const data = await callTool("read_query", { query });
      setQueryResults(data || []);
    } catch (err: unknown) {
      setQueryError(err instanceof Error ? err.message : "Failed to execute query.");
      setQueryResults(null);
    } finally {
      setIsExecuting(false);
    }
  };

  // Handle NL Query execution via LangGraph API endpoint
  const handleExecuteNLQuery = async (e: FormEvent) => {
    e.preventDefault();
    if (!nlQuery.trim()) return;
    setIsNlExecuting(true);
    setNlError(null);
    setNlResult(null);

    try {
      const res = await fetch("http://localhost:3001/api/nl-query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: nlQuery }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to execute NL query");
      }
      const data = await res.json();
      setNlResult(data);
    } catch (err: unknown) {
      setNlError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsNlExecuting(false);
    }
  };

  // Helper to render the data table
  const renderDataTable = (
    results: Record<string, unknown>[] | null | undefined,
    errorState: string | null,
  ) => {
    if (errorState) {
      return (
        <div className="m-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600 font-mono text-sm max-h-48 overflow-auto">
          {errorState}
        </div>
      );
    }
    if (!results) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-surface-400 text-sm">
          Run your execution to see results here.
        </div>
      );
    }
    if (results.length === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-surface-400 text-sm">
          Query returned 0 rows.
        </div>
      );
    }
    return (
      <table className="w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface-100 border-b border-surface-200">
            {Object.keys(results[0]).map((key) => (
              <th
                key={key}
                className="px-4 py-3 font-semibold text-surface-600 whitespace-nowrap text-xs uppercase tracking-wider"
              >
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => (
            <tr
              // biome-ignore lint/suspicious/noArrayIndexKey: SQL result rows have no stable unique ID
              key={i}
              className="hover:bg-brand-50/50 border-b border-surface-100 transition-colors"
            >
              {Object.values(row).map((val: unknown, j) => (
                <td
                  // biome-ignore lint/suspicious/noArrayIndexKey: Column values have no stable unique ID
                  key={j}
                  className="px-4 py-2.5 text-surface-700 whitespace-nowrap max-w-[250px] overflow-hidden text-ellipsis"
                >
                  {val === null ? (
                    <span className="text-surface-300 italic">null</span>
                  ) : (
                    String(val)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex h-screen w-full bg-surface-50 text-surface-900 overflow-hidden font-sans">
      {/* Sidebar */}
      <aside className="w-72 sidebar-glass flex flex-col z-10">
        <div className="p-6 border-b border-surface-200 flex items-center gap-3">
          <div className="p-2 bg-brand-100 rounded-xl text-brand-600">
            <DatabaseZap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-surface-900">DataStudio</h1>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span
                className={`w-2 h-2 rounded-full ${isConnected ? "bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.4)]" : "bg-red-400"}`}
              ></span>
              <span className="text-surface-500">
                {isConnected ? "Server Connected" : "Disconnected"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-1">
          <h2 className="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-2 px-2">
            Tables
          </h2>
          {tables.length === 0 && isConnected && (
            <div className="text-surface-400 text-sm px-2 text-center py-4">No tables found.</div>
          )}
          {tables.map((table) => (
            <button
              type="button"
              key={table.name}
              onClick={() => handleSelectTable(table.name)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative overflow-hidden ${
                selectedTable === table.name
                  ? "bg-brand-100 text-brand-700 border border-brand-200 font-medium shadow-sm"
                  : "text-surface-600 hover:bg-surface-100 hover:text-surface-800 border border-transparent"
              }`}
            >
              {selectedTable === table.name && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-400 rounded-r" />
              )}
              <Table
                size={16}
                className={
                  selectedTable === table.name
                    ? "text-brand-500"
                    : "text-surface-400 group-hover:text-surface-500"
                }
              />
              {table.name}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 m-4 bg-red-50 border border-red-200 rounded-lg text-red-600 text-xs">
            {error}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Subtle background accent */}
        <div className="absolute top-[-15%] right-[-8%] w-96 h-96 bg-brand-200/30 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-15%] left-[15%] w-[500px] h-[500px] bg-brand-100/40 rounded-full blur-[120px] pointer-events-none" />

        {!selectedTable ? (
          <div className="flex-1 flex flex-col items-center justify-center text-surface-400 z-10">
            <div className="p-5 bg-brand-50 rounded-2xl mb-4 border border-brand-100">
              <Database size={36} className="text-brand-400" />
            </div>
            <p className="text-lg text-surface-500">Select a table to view its schema and data.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full z-10 p-6 overflow-hidden">
            {/* Schema Viewer */}
            <div className="mb-4 card p-5 flex-shrink-0">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2 text-surface-800">
                <Table size={18} className="text-brand-500" />
                Table Schema: <span className="text-brand-600">{selectedTable}</span>
              </h2>
              {schema ? (
                <div className="card-inset p-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-surface-600">{schema.createStatement}</pre>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center">
                  <Loader2 className="animate-spin text-brand-400" />
                </div>
              )}
            </div>

            {/* Tabs Header */}
            <div className="flex gap-4 border-b border-surface-200 px-2 mb-4 shrink-0">
              <button
                type="button"
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors border-b-2 px-2 -mb-[1px] ${
                  activeTab === "sql"
                    ? "text-brand-600 border-brand-400"
                    : "text-surface-400 border-transparent hover:text-surface-600"
                }`}
                onClick={() => setActiveTab("sql")}
              >
                <Terminal size={16} /> Raw SQL
              </button>
              <button
                type="button"
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors border-b-2 px-2 -mb-[1px] ${
                  activeTab === "nl"
                    ? "text-brand-600 border-brand-400"
                    : "text-surface-400 border-transparent hover:text-surface-600"
                }`}
                onClick={() => setActiveTab("nl")}
              >
                <Sparkles size={16} /> Ask AI
              </button>
            </div>

            {/* Query & Results */}
            <div className="flex-1 flex flex-col card overflow-hidden min-h-0 relative">
              {activeTab === "sql" ? (
                <>
                  <form
                    onSubmit={handleExecuteQuery}
                    className="border-b border-surface-200 shrink-0"
                  >
                    <div className="flex items-center justify-between p-2.5 border-b border-surface-100 bg-surface-50">
                      <div className="flex items-center gap-2 px-2 text-sm text-surface-500">
                        <Terminal size={14} />
                        <span>SQL Query</span>
                      </div>
                      <button
                        type="submit"
                        disabled={isExecuting || !query.trim()}
                        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isExecuting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Play size={16} />
                        )}
                        Run Query
                      </button>
                    </div>
                    <div className="p-4 bg-white">
                      <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full h-24 bg-transparent text-surface-800 font-mono text-sm resize-none focus:outline-none placeholder-surface-300"
                        placeholder="Enter your SQL query here (e.g. SELECT * FROM products limit 10;)"
                      />
                    </div>
                  </form>
                  <div className="flex-1 overflow-auto bg-white relative">
                    {renderDataTable(queryResults, queryError)}
                  </div>
                </>
              ) : (
                <>
                  {/* NL Tab Content */}
                  <form
                    onSubmit={handleExecuteNLQuery}
                    className="border-b border-surface-200 shrink-0"
                  >
                    <div className="flex items-center justify-between p-2.5 border-b border-surface-100 bg-surface-50">
                      <div className="flex items-center gap-2 px-2 text-sm text-surface-500">
                        <MessageSquare size={14} />
                        <span>Natural Language Prompt</span>
                      </div>
                      <button
                        type="submit"
                        disabled={isNlExecuting || !nlQuery.trim()}
                        className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      >
                        {isNlExecuting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Sparkles size={16} />
                        )}
                        Ask Agent
                      </button>
                    </div>
                    <div className="p-4 bg-white">
                      <textarea
                        value={nlQuery}
                        onChange={(e) => setNlQuery(e.target.value)}
                        className="w-full h-16 bg-transparent text-surface-800 text-sm resize-none focus:outline-none placeholder-surface-300"
                        placeholder="e.g. Can you show me the name and price of electronics under $100?"
                      />
                    </div>
                  </form>

                  {/* Results panel for NL */}
                  <div className="flex-1 flex flex-col min-h-0 bg-white">
                    {nlResult && !nlError && (
                      <div className="p-4 border-b border-surface-100 grid gap-3 shrink-0 text-xs">
                        <div className="space-y-1">
                          <span className="text-surface-400 font-semibold uppercase tracking-wide mb-1 block">
                            Agent Thought
                          </span>
                          <div className="text-brand-700 bg-brand-50 p-3 rounded-lg border border-brand-100">
                            {nlResult.thought}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-surface-400 font-semibold uppercase tracking-wide mb-1 flex items-center gap-1">
                            <Terminal size={12} /> Generated SQL
                          </span>
                          <div className="text-brand-800 font-mono bg-surface-50 p-3 rounded-lg border border-surface-200 overflow-x-auto whitespace-pre">
                            {nlResult.generated_sql || "N/A"}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 relative overflow-auto min-h-0">
                      {(nlResult?.results || nlError) &&
                        renderDataTable(nlResult?.results, nlError)}
                      {!nlResult && !nlError && !isNlExecuting && (
                        <div className="absolute inset-0 flex items-center justify-center text-surface-400 text-sm text-center px-8">
                          Enter a prompt above and the LangGraph Agent will analyze your request,
                          <br />
                          formulate an SQL query, and run it.
                        </div>
                      )}
                      {isNlExecuting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-500 text-sm bg-white/80 backdrop-blur-sm z-20">
                          <Loader2 size={32} className="animate-spin mb-3 text-brand-500" />
                          The AI is thinking...
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
