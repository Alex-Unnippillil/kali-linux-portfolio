import * as Comlink from 'comlink';
import initSqlJs, { Database } from 'sql.js';

let SQL: any;
let db: Database | null = null;

async function init(stream?: ReadableStream<Uint8Array>) {
  if (!SQL) {
    SQL = await initSqlJs();
  }
  if (db) {
    db.close();
    db = null;
  }
  if (stream) {
    const reader = stream.getReader();
    const chunks: Uint8Array[] = [];
    let lastYield = performance.now();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) chunks.push(value);
      if (performance.now() - lastYield > 40) {
        await new Promise((r) => setTimeout(r, 0));
        lastYield = performance.now();
      }
    }
    const size = chunks.reduce((a, c) => a + c.length, 0);
    const buffer = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      buffer.set(c, offset);
      offset += c.length;
    }
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }
}

function exec(query: string, params?: any[]) {
  if (!db) throw new Error('Database not initialized');
  const stmt = db.prepare(query);
  if (params && params.length > 0) {
    stmt.bind(params);
  }
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function close() {
  if (db) {
    db.close();
    db = null;
  }
}

Comlink.expose({ init, exec, close });
