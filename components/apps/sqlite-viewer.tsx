import React, { useState } from 'react';

// SQLite viewer using sql.js loaded from CDN
const SqliteViewer: React.FC = () => {
  const [db, setDb] = useState<any | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState('');

  const loadSql = async () => {
    if (typeof window === 'undefined') return null;
    if ((window as any).initSqlJs) return (window as any).initSqlJs;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
    return (window as any).initSqlJs;
  };

  const loadDb = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const initSqlJs = await loadSql();
    if (!initSqlJs) return;
    const SQL = await initSqlJs({
      locateFile: (fileName: string) =>
        `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/${fileName}`,
    });
    const database = new SQL.Database(new Uint8Array(arrayBuffer));
    setDb(database);
    const res = database.exec("SELECT name FROM sqlite_master WHERE type='table'");
    const tableNames = res[0]?.values?.map((v: any[]) => v[0]) || [];
    setTables(tableNames);
    if (tableNames.length > 0) {
      const previewQuery = `SELECT * FROM ${tableNames[0]} LIMIT 10;`;
      setQuery(previewQuery);
      try {
        const preview = database.exec(previewQuery);
        setResult(preview[0] || null);
      } catch {
        setResult(null);
      }
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadDb(file);
  };

  const runQuery = () => {
    if (!db) return;
    try {
      const res = db.exec(query);
      setResult(res[0] || null);
      setError('');
    } catch (err: any) {
      setError(err.message);
      setResult(null);
    }
  };

  return (
    <div className="h-full w-full p-2 bg-panel text-white overflow-auto">
      <input
        type="file"
        accept=".sqlite,.db"
        onChange={handleFile}
        className="mb-2"
      />
      {tables.length > 0 && (
        <div className="mb-2">
          <span className="font-bold">Tables:</span> {tables.join(', ')}
        </div>
      )}
      {db && (
        <div className="mb-2">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={4}
            className="w-full text-black p-1"
          />
          <button
            onClick={runQuery}
            className="mt-2 px-2 py-1 bg-blue-600 text-white"
          >
            Run
          </button>
          {error && <div className="text-red-500 mt-2">{error}</div>}
          {result && (
            <div className="overflow-auto mt-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {result.columns.map((c: string) => (
                      <th key={c} className="border px-1 py-0.5">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.values.map((row: any[], i: number) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className="border px-1 py-0.5">
                          {String(cell)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default SqliteViewer;

export const displaySqliteViewer = () => <SqliteViewer />;

