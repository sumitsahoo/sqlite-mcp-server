import { useEffect, useState, FormEvent } from "react";
import { useMcp } from "./lib/mcp";
import { Database, Table, Play, Terminal, DatabaseZap, Loader2, Sparkles, MessageSquare } from "lucide-react";

type TableInfo = { name: string };
type SchemaInfo = { createStatement: string; columns: any[] };

function App() {
  const { isConnected, error, callTool } = useMcp();
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schema, setSchema] = useState<SchemaInfo | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState<"sql" | "nl">("sql");

  // Raw SQL State
  const [query, setQuery] = useState("");
  const [queryResults, setQueryResults] = useState<any[] | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);

  // NL Query State
  const [nlQuery, setNlQuery] = useState("");
  const [nlResult, setNlResult] = useState<{ thought?: string, generated_sql?: string, results?: any[] } | null>(null);
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
    // Auto-fill query for convenience
    setQuery(`SELECT * FROM ${tableName} LIMIT 50;`);
    setQueryResults(null);
    setQueryError(null);

    try {
      const data = await callTool("get_schema", { tableName });
      if (data) setSchema(data);
    } catch (err: any) {
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
    } catch (err: any) {
      setQueryError(err.message || "Failed to execute query.");
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
      const res = await fetch('http://localhost:3001/api/nl-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: nlQuery })
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to execute NL query");
      }
      const data = await res.json();
      setNlResult(data);
    } catch (err: any) {
      setNlError(err.message || "Something went wrong.");
    } finally {
      setIsNlExecuting(false);
    }
  };

  // Helper to render the data table
  const renderDataTable = (results: any[] | null | undefined, errorState: string | null) => {
    if (errorState) {
      return (
        <div className="m-4 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 font-mono text-sm max-h-48 overflow-auto">
          {errorState}
        </div>
      );
    }
    if (!results) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-surface-600 text-sm">
          Run your execution to see results here.
        </div>
      );
    }
    if (results.length === 0) {
      return (
        <div className="absolute inset-0 flex items-center justify-center text-surface-500 text-sm">
          Query returned 0 rows.
        </div>
      );
    }
    return (
      <table className="w-full text-left border-collapse text-sm">
        <thead className="sticky top-0 bg-surface-900 shadow-md ring-1 ring-white/5 z-10">
          <tr>
            {Object.keys(results[0]).map((key) => (
              <th key={key} className="px-4 py-3 font-semibold text-surface-300 border-b border-white/10 bg-surface-900 whitespace-nowrap">
                {key}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {results.map((row, i) => (
            <tr key={i} className="hover:bg-white/5 border-b border-white/5 transition-colors">
              {Object.values(row).map((val: any, j) => (
                <td key={j} className="px-4 py-2.5 text-surface-400 whitespace-nowrap max-w-[250px] overflow-hidden text-ellipsis">
                  {val === null ? <span className="text-surface-600 italic">null</span> : String(val)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className="flex h-screen w-full bg-surface-950 text-surface-50 overflow-hidden font-sans">
      {/* Sidebar - Tables List */}
      <aside className="w-72 glass border-r border-white/10 flex flex-col z-10">
        <div className="p-6 border-b border-white/10 flex items-center gap-3">
          <div className="p-2 bg-brand-500/20 rounded-lg text-brand-400">
            <DatabaseZap size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">DataStudio</h1>
            <div className="flex items-center gap-2 text-xs mt-1">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500'}`}></span>
              <span className="text-surface-400">{isConnected ? 'Server Connected' : 'Disconnected'}</span>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
          <h2 className="text-xs font-semibold text-surface-500 uppercase tracking-wider mb-2 px-2">Databases</h2>
          {tables.length === 0 && isConnected && (
            <div className="text-surface-500 text-sm px-2 text-center py-4">No tables found.</div>
          )}
          {tables.map((table) => (
            <button
              key={table.name}
              onClick={() => handleSelectTable(table.name)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative overflow-hidden ${selectedTable === table.name
                  ? "bg-brand-500/20 text-brand-300 border border-brand-500/30 font-medium"
                  : "text-surface-300 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
            >
              {selectedTable === table.name && (
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-500" />
              )}
              <Table size={16} className={selectedTable === table.name ? "text-brand-400" : "text-surface-500 group-hover:text-surface-300"} />
              {table.name}
            </button>
          ))}
        </div>

        {error && (
          <div className="p-4 m-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs">
            {error}
          </div>
        )}
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Gradients */}
        <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-brand-600/20 rounded-full blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-10%] left-[20%] w-[500px] h-[500px] bg-brand-900/30 rounded-full blur-[120px] pointer-events-none" />

        {!selectedTable ? (
          <div className="flex-1 flex flex-col items-center justify-center text-surface-500 z-10">
            <div className="p-4 bg-white/5 rounded-full mb-4 border border-white/10">
              <Database size={32} className="text-brand-400 opacity-50" />
            </div>
            <p className="text-lg">Select a table to view its schema and data.</p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full z-10 p-6 overflow-hidden">
            {/* Top Row: Schema Viewer */}
            <div className="mb-4 glass-card rounded-xl p-5 border border-white/10 flex-shrink-0">
              <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
                <Table size={18} className="text-brand-400" />
                Table Schema: <span className="text-brand-300">{selectedTable}</span>
              </h2>
              {schema ? (
                <div className="bg-surface-900 border border-surface-800 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                  <pre className="text-surface-300">{schema.createStatement}</pre>
                </div>
              ) : (
                <div className="h-20 flex items-center justify-center">
                  <Loader2 className="animate-spin text-brand-500" />
                </div>
              )}
            </div>

            {/* Tabs Header */}
            <div className="flex gap-4 border-b border-white/10 px-2 mb-4 shrink-0">
              <button
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors border-b-2 px-2 -mb-[1px] ${activeTab === 'sql' ? 'text-brand-400 border-brand-400' : 'text-surface-400 border-transparent hover:text-surface-300'
                  }`}
                onClick={() => setActiveTab('sql')}
              >
                <Terminal size={16} /> Raw SQL
              </button>
              <button
                className={`flex items-center gap-2 pb-2 text-sm font-medium transition-colors border-b-2 px-2 -mb-[1px] ${activeTab === 'nl' ? 'text-brand-400 border-brand-400' : 'text-surface-400 border-transparent hover:text-surface-300'
                  }`}
                onClick={() => setActiveTab('nl')}
              >
                <Sparkles size={16} /> Ask AI (NL)
              </button>
            </div>

            {/* Bottom Row: Query Editor & Results based on Tab */}
            <div className="flex-1 flex flex-col glass-card rounded-xl border border-white/10 overflow-hidden min-h-0 relative">

              {activeTab === 'sql' ? (
                <>
                  <form onSubmit={handleExecuteQuery} className="border-b border-white/10 bg-surface-900/50 shrink-0">
                    <div className="flex items-center justify-between p-2 border-b border-white/5 bg-surface-950/80">
                      <div className="flex items-center gap-2 px-2 text-sm text-surface-400">
                        <Terminal size={14} />
                        <span>SQL Query</span>
                      </div>
                      <button
                        type="submit"
                        disabled={isExecuting || !query.trim()}
                        className="flex items-center gap-2 bg-brand-600 hover:bg-brand-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isExecuting ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
                        Run Query
                      </button>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        className="w-full h-24 bg-transparent text-surface-100 font-mono text-sm resize-none focus:outline-none placeholder-surface-600"
                        placeholder="Enter your SQL query here (e.g. SELECT * FROM products limit 10;)"
                      />
                    </div>
                  </form>
                  <div className="flex-1 overflow-auto bg-surface-950/40 relative">
                    {renderDataTable(queryResults, queryError)}
                  </div>
                </>
              ) : (
                <>
                  {/* NL Tab Content */}
                  <form onSubmit={handleExecuteNLQuery} className="border-b border-white/10 bg-surface-900/50 shrink-0">
                    <div className="flex items-center justify-between p-2 border-b border-white/5 bg-surface-950/80">
                      <div className="flex items-center gap-2 px-2 text-sm text-surface-400">
                        <MessageSquare size={14} />
                        <span>Natural Language Prompt</span>
                      </div>
                      <button
                        type="submit"
                        disabled={isNlExecuting || !nlQuery.trim()}
                        className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white px-4 py-1.5 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(99,102,241,0.2)]"
                      >
                        {isNlExecuting ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                        Ask Agent
                      </button>
                    </div>
                    <div className="p-4">
                      <textarea
                        value={nlQuery}
                        onChange={(e) => setNlQuery(e.target.value)}
                        className="w-full h-16 bg-transparent text-surface-100 text-sm resize-none focus:outline-none placeholder-surface-600"
                        placeholder="e.g. Can you show me the name and price of electronics under $100?"
                      />
                    </div>
                  </form>

                  {/* Results panel for NL (Shows Thought, Generated SQL, and final Results) */}
                  <div className="flex-1 flex flex-col min-h-0 bg-surface-950/40">
                    {nlResult && !nlError && (
                      <div className="p-4 border-b border-white/5 bg-surface-900/40 grid gap-3 shrink-0 uppercase tracking-wide text-xs">
                        <div className="space-y-1">
                          <span className="text-surface-500 font-semibold mb-1 block">Agent Thought</span>
                          <div className="text-brand-300 normal-case bg-surface-950/50 p-2 rounded-md border border-white/5">{nlResult.thought}</div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-surface-500 font-semibold mb-1 flex items-center gap-1"><Terminal size={12} /> Generated SQL</span>
                          <div className="text-green-400 font-mono normal-case bg-surface-950/80 p-2 rounded-md border border-white/5 overflow-x-auto whitespace-pre">
                            {nlResult.generated_sql || "N/A"}
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="flex-1 relative overflow-auto">
                      {renderDataTable(nlResult?.results, nlError)}
                      {!nlResult && !nlError && !isNlExecuting && (
                        <div className="absolute inset-0 flex items-center justify-center text-surface-600 text-sm text-center px-8">
                          Enter a prompt above and the LangGraph Agent will analyze your request,<br />formulate an SQL query, and run it.
                        </div>
                      )}
                      {isNlExecuting && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-brand-400 text-sm bg-surface-950/80 backdrop-blur-sm z-20">
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
