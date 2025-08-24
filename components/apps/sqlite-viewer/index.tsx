import React, { useEffect, useRef, useState } from 'react';
import Papa from 'papaparse';

interface Result {
  columns: string[];
  rows: any[][];
}

interface View { name: string; query: string; }
interface Session { history: string[]; views: View[]; }

const SESSION_FILE = 'sqlite-viewer-session.json';
const PAGE_SIZE = 100;

async function readFileChunked(file: File): Promise<Uint8Array> {
  const chunkSize = 4 * 1024 * 1024; // 4MB
  const buffer = new Uint8Array(file.size);
  let offset = 0;
  while (offset < file.size) {
    const slice = file.slice(offset, offset + chunkSize);
    const ab = await slice.arrayBuffer();
    buffer.set(new Uint8Array(ab), offset);
    offset += chunkSize;
  }
  return buffer;
}

async function saveSession(data: Session) {
  const text = JSON.stringify(data);
  if ((navigator as any).storage?.getDirectory) {
    try {
      const root = await (navigator as any).storage.getDirectory();
      const handle = await root.getFileHandle(SESSION_FILE, { create: true });
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      return;
    } catch {}
  }
  const db = await openIDB();
  const tx = db.transaction('kv', 'readwrite');
  tx.objectStore('kv').put(text, 'session');
  await tx.done;
  db.close();
}

async function loadSession(): Promise<Session | null> {
  if ((navigator as any).storage?.getDirectory) {
    try {
      const root = await (navigator as any).storage.getDirectory();
      const handle = await root.getFileHandle(SESSION_FILE);
      const file = await handle.getFile();
      return JSON.parse(await file.text());
    } catch {}
  }
  const db = await openIDB();
  const tx = db.transaction('kv', 'readonly');
  const req = tx.objectStore('kv').get('session');
  const result: string = await new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result as any);
    req.onerror = () => resolve(null);
  });
  db.close();
  return result ? JSON.parse(result) : null;
}

function openIDB(): Promise<any> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('sqlite-viewer', 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore('kv');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
};

const SqliteViewer: React.FC = () => {
  const workerRef = useRef<Worker | null>(null);
  const [schema, setSchema] = useState<string[]>([]);
  const [query, setQuery] = useState('SELECT name FROM sqlite_schema WHERE type="table"');
  const [result, setResult] = useState<Result | null>(null);
  const [page, setPage] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [views, setViews] = useState<View[]>([]);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    loadSession().then((s) => {
      if (s) {
        setHistory(s.history || []);
        setViews(s.views || []);
      }
    });
    return () => workerRef.current?.terminate();
  }, []);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const data = await readFileChunked(file);
    const worker = new Worker(new URL('./sqlWorker.ts', import.meta.url), {
      type: 'module',
    });
    worker.onmessage = (ev) => {
      const msg = ev.data as any;
      if (msg.type === 'schema') {
        setSchema((prev) => [...prev, msg.table]);
      } else if (msg.type === 'result') {
        setResult({ columns: msg.columns, rows: msg.rows });
        setRunning(false);
      } else if (msg.type === 'progress') {
        setProgress(msg.rows);
      } else if (msg.type === 'cancelled') {
        setRunning(false);
      } else if (msg.type === 'error') {
        console.error(msg.error);
        setRunning(false);
      }
    };
    worker.postMessage({ type: 'init', buffer: data.buffer }, [data.buffer]);
    workerRef.current = worker;
    setSchema([]);
    setResult(null);
    setPage(0);
  };

  const runQuery = (p = page) => {
    if (!workerRef.current) return;
    setProgress(0);
    setRunning(true);
    workerRef.current.postMessage({
      type: 'exec',
      query,
      limit: PAGE_SIZE,
      offset: p * PAGE_SIZE,
    });
    const newHistory = [query, ...history.filter((h) => h !== query)].slice(0, 50);
    setHistory(newHistory);
    saveSession({ history: newHistory, views });
  };

  const cancelQuery = () => {
    workerRef.current?.postMessage({ type: 'cancel' });
  };

  const exportCSV = () => {
    if (!result) return;
    const csv = Papa.unparse({ fields: result.columns, data: result.rows });
    download(new Blob([csv], { type: 'text/csv' }), 'result.csv');
  };

  const exportParquet = async () => {
    if (!result) return;
    const rows = result.rows.map((r) =>
      Object.fromEntries(result.columns.map((c, i) => [c, r[i]]))
    );
    const arrow = await import('apache-arrow');
    // Create Arrow table and convert to Parquet
    const table = arrow.tableFromJSON(rows);
    const { Table, writeParquet } = await import('parquet-wasm');
    const ipc = arrow.tableToIPC(table);
    const parquetTable = Table.fromIPCStream(ipc); // convert
    const buf = writeParquet(parquetTable);
    download(new Blob([buf], { type: 'application/octet-stream' }), 'result.parquet');
  };

  const saveView = () => {
    const name = prompt('View name');
    if (!name) return;
    const newViews = [...views, { name, query }];
    setViews(newViews);
    saveSession({ history, views: newViews });
  };

  const selectHistory = (q: string) => {
    setQuery(q);
    setPage(0);
    runQuery(0);
  };

  const selectView = (v: View) => {
    setQuery(v.query);
    setPage(0);
    runQuery(0);
  };

  return (
    <div className="p-4 h-full w-full text-white bg-ub-cool-grey overflow-auto">
      <input type="file" onChange={handleFile} className="mb-2" />
      {schema.length > 0 && (
        <div className="mb-2">
          <h3 className="font-bold">Schema</h3>
          <ul className="text-sm max-h-32 overflow-y-auto bg-black p-2">
            {schema.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </div>
      )}
      <textarea
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full h-24 text-black p-1 mb-2"
      />
      <div className="flex space-x-2 mb-2">
        <button
          onClick={() => runQuery(0)}
          className="px-2 py-1 bg-green-600"
          disabled={running}
        >
          Run
        </button>
        <button
          onClick={cancelQuery}
          className="px-2 py-1 bg-red-600"
          disabled={!running}
        >
          Cancel
        </button>
        <button onClick={exportCSV} disabled={!result} className="px-2 py-1 bg-blue-600">
          CSV
        </button>
        <button onClick={exportParquet} disabled={!result} className="px-2 py-1 bg-blue-600">
          Parquet
        </button>
        <button onClick={saveView} className="px-2 py-1 bg-gray-700">
          Save View
        </button>
      </div>
      {running && <div className="mb-2 text-sm">Rows processed: {progress}</div>}
      {result && (
        <div className="overflow-auto">
          <table className="text-xs">
            <thead>
              <tr>
                {result.columns.map((c) => (
                  <th key={c} className="border px-1">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {result.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((v, j) => (
                    <td key={j} className="border px-1">
                      {String(v)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {result && (
        <div className="mt-2 flex items-center space-x-2">
          <button
            onClick={() => {
              const p = Math.max(0, page - 1);
              setPage(p);
              runQuery(p);
            }}
            disabled={page === 0}
            className="px-2 py-1 bg-gray-600"
          >
            Prev
          </button>
          <span>Page {page + 1}</span>
          <button
            onClick={() => {
              const p = page + 1;
              setPage(p);
              runQuery(p);
            }}
            className="px-2 py-1 bg-gray-600"
          >
            Next
          </button>
        </div>
      )}
      {history.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold">History</h3>
          <ul className="text-sm">
            {history.map((h, i) => (
              <li key={i}>
                <button
                  onClick={() => selectHistory(h)}
                  className="underline text-left"
                >
                  {h}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {views.length > 0 && (
        <div className="mt-4">
          <h3 className="font-bold">Saved Views</h3>
          <ul className="text-sm">
            {views.map((v, i) => (
              <li key={i}>
                <button
                  onClick={() => selectView(v)}
                  className="underline text-left"
                >
                  {v.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default SqliteViewer;
export const displaySqliteViewer = () => <SqliteViewer />;
