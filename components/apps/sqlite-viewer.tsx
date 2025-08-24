import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

// SQLite viewer using sql.js loaded from CDN
// Minimal interface for sql.js Database object
interface SqlJsDatabase {
  exec: (sql: string) => Array<{ columns: string[]; values: any[] }>;
}

const PAGE_SIZE = 100;

const SqliteViewer: React.FC = () => {
  const [db, setDb] = useState<SqlJsDatabase | null>(null);
  const [tables, setTables] = useState<string[]>([]);
  const [schema, setSchema] = useState<
    Record<string, { refs: string[]; preview: any[][] }>
  >({});
  const [query, setQuery] = useState('');
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[][]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [plan, setPlan] = useState<any | null>(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const tableRef = useRef<HTMLDivElement>(null);

  const loadSql = async () => {
    if (typeof window === 'undefined') return null;
    if ((window as any).initSqlJs) return (window as any).initSqlJs;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.10.2/sql-wasm.js';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
    return (window as any).initSqlJs;
  };

  const buildSchema = (database: SqlJsDatabase, tableNames: string[]) => {
    const obj: Record<string, { refs: string[]; preview: any[][] }> = {};
    tableNames.forEach((t) => {
      let refs: string[] = [];
      let preview: any[][] = [];
      try {
        const fk = database.exec(`PRAGMA foreign_key_list(${t})`);
        refs = fk[0]?.values?.map((v: any[]) => v[2]) || [];
      } catch {}
      try {
        const pre = database.exec(`SELECT * FROM ${t} LIMIT 3`);
        preview = pre[0]?.values || [];
      } catch {}
      obj[t] = { refs, preview };
    });
    setSchema(obj);
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
    const res = database.exec(
      "SELECT name FROM sqlite_master WHERE type='table'"
    );
    const tableNames = res[0]?.values?.map((v: any[]) => v[0]) || [];
    setTables(tableNames);
    buildSchema(database, tableNames);
    if (tableNames.length > 0) {
      const previewQuery = `SELECT * FROM ${tableNames[0]} LIMIT 10;`;
      setQuery(previewQuery);
      try {
        const preview = database.exec(previewQuery);
        setColumns(preview[0]?.columns || []);
        setRows(preview[0]?.values || []);
        setHasMore(false);
      } catch {
        setColumns([]);
        setRows([]);
      }
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadDb(file);
  };

  const runQuery = useCallback(() => {
    if (!db) return;
    if (
      /^\s*(INSERT|UPDATE|DELETE|CREATE|DROP|ALTER|REPLACE|TRUNCATE|VACUUM|ATTACH|DETACH|REINDEX|ANALYZE)/i.test(
        query
      )
    ) {
      setError('Readonly mode: only SELECT/PRAGMA/EXPLAIN allowed');
      return;
    }
    try {
      const res = db.exec(
        `SELECT * FROM (${query}) LIMIT ${PAGE_SIZE} OFFSET 0`
      );
      setColumns(res[0]?.columns || []);
      setRows(res[0]?.values || []);
      setOffset(0);
      setHasMore((res[0]?.values?.length || 0) === PAGE_SIZE);
      setPlan(null);
      setError('');
    } catch (err: any) {
      setError(err.message);
      setColumns([]);
      setRows([]);
      setHasMore(false);
    }
  }, [db, query]);

  const loadMore = useCallback(() => {
    if (!db || !hasMore) return;
    try {
      const nextOffset = offset + PAGE_SIZE;
      const res = db.exec(
        `SELECT * FROM (${query}) LIMIT ${PAGE_SIZE} OFFSET ${nextOffset}`
      );
      if (res[0]) {
        setRows((prev) => [...prev, ...res[0].values]);
        setOffset(nextOffset);
        setHasMore(res[0].values.length === PAGE_SIZE);
      } else {
        setHasMore(false);
      }
    } catch {}
  }, [db, query, offset, hasMore]);

  useEffect(() => {
    const el = tableRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
        loadMore();
      }
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, [loadMore]);

  const explain = () => {
    if (!db) return;
    try {
      const res = db.exec(`EXPLAIN QUERY PLAN ${query}`);
      setPlan(res[0] || null);
      setError('');
    } catch (err: any) {
      setError(err.message);
      setPlan(null);
    }
  };

  const filteredRows = rows.filter((r) =>
    search
      ? r.some((cell) =>
          String(cell).toLowerCase().includes(search.toLowerCase())
        )
      : true
  );

  const exportCsv = () => {
    if (columns.length === 0) return;
    const header = columns.join(',');
    const body = rows
      .map((row) =>
        row
          .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([header + '\n' + body], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'result.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadParquet = async () => {
    if (typeof window === 'undefined') return null;
    if ((window as any).parquetWasm) return (window as any).parquetWasm;
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement('script');
      script.src =
        'https://cdn.jsdelivr.net/npm/parquet-wasm@0.5.0/arrow2.js';
      script.onload = () => resolve();
      script.onerror = () => reject();
      document.body.appendChild(script);
    });
    return (window as any).parquetWasm;
  };

  const exportParquet = async () => {
    try {
      const parquet = await loadParquet();
      if (!parquet) throw new Error('Parquet library not loaded');
      const data: Record<string, any[]> = {};
      columns.forEach((c, i) => {
        data[c] = rows.map((r) => r[i]);
      });
      const table = parquet.tableFromArrays(data);
      const binary = parquet.writeParquet(table);
      const blob = new Blob([binary], {
        type: 'application/octet-stream',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'result.parquet';
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError('Parquet export failed');
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
      {Object.keys(schema).length > 0 && (
        <div className="mb-2">
          <span className="font-bold">Schema:</span>
          <ul className="text-xs">
            {Object.entries(schema).map(([t, info]) => (
              <li key={t}>
                <span
                  className="underline cursor-pointer"
                  onClick={() => setQuery(`SELECT * FROM ${t} LIMIT 10`)}
                >
                  {t}
                </span>
                {info.refs.length > 0 && <span> → {info.refs.join(', ')}</span>}
                {info.preview.length > 0 && (
                  <span className="ml-1">
                    [
                    {info.preview
                      .map((r) => r.join(', '))
                      .join(' | ')}
                    ]
                  </span>
                )}
              </li>
            ))}
          </ul>
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
          <div className="mt-2 flex gap-2">
            <button onClick={runQuery} className="px-2 py-1 bg-blue-600 text-white">
              Run
            </button>
            <button onClick={explain} className="px-2 py-1 bg-gray-600 text-white">
              Explain
            </button>
            {rows.length > 0 && (
              <>
                <button
                  onClick={exportCsv}
                  className="px-2 py-1 bg-green-600 text-white"
                >
                  CSV
                </button>
                <button
                  onClick={exportParquet}
                  className="px-2 py-1 bg-green-800 text-white"
                >
                  Parquet
                </button>
              </>
            )}
          </div>
          <input
            type="text"
            placeholder="Search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mt-2 w-full text-black p-1"
          />
          {error && <div className="text-red-500 mt-2">{error}</div>}
          {plan && (
            <div className="overflow-auto mt-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {plan.columns.map((c: string) => (
                      <th key={c} className="border px-1 py-0.5">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {plan.values.map((row: any[], i: number) => (
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
          {columns.length > 0 && (
            <div ref={tableRef} className="overflow-auto max-h-80 mt-2">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    {columns.map((c: string) => (
                      <th key={c} className="border px-1 py-0.5">
                        {c}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.map((row: any[], i: number) => (
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
