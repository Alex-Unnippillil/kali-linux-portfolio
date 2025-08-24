import initSqlJs, { Database, Statement } from 'sql.js';

let db: Database | null = null;
let currentStmt: Statement | null = null;
let cancelRequested = false;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data as any;
  if (msg.type === 'init') {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/${file}`,
    });
    db = new SQL.Database(new Uint8Array(msg.buffer));
    // Stream schema: post each table name
    const stmt = db.prepare(
      "SELECT name FROM sqlite_schema WHERE type IN ('table','view') ORDER BY name"
    );
    while (stmt.step()) {
      const row = stmt.getAsObject();
      (self as any).postMessage({ type: 'schema', table: row.name });
    }
    stmt.free();
    (self as any).postMessage({ type: 'ready' });
  } else if (msg.type === 'cancel') {
    cancelRequested = true;
    if (currentStmt) {
      currentStmt.free();
      currentStmt = null;
    }
  } else if (msg.type === 'exec') {
    if (!db) {
      (self as any).postMessage({ type: 'error', error: 'DB not initialized' });
      return;
    }
    try {
      const { query, limit, offset } = msg;
      cancelRequested = false;
      const stmt = db.prepare(query);
      currentStmt = stmt;
      const cols = stmt.getColumnNames();
      let skipped = 0;
      while (skipped < offset && stmt.step()) skipped++;
      const rows: any[] = [];
      let count = 0;
      (self as any).postMessage({ type: 'progress', rows: 0 });
      while (stmt.step()) {
        if (cancelRequested) {
          stmt.free();
          currentStmt = null;
          (self as any).postMessage({ type: 'cancelled' });
          return;
        }
        rows.push(stmt.get());
        count++;
        if (count % 100 === 0) {
          (self as any).postMessage({ type: 'progress', rows: count });
          await new Promise((r) => setTimeout(r, 0));
        }
        if (count >= limit) break;
      }
      stmt.free();
      currentStmt = null;
      if (cancelRequested) {
        (self as any).postMessage({ type: 'cancelled' });
      } else {
        (self as any).postMessage({ type: 'result', columns: cols, rows });
      }
    } catch (err: any) {
      (self as any).postMessage({ type: 'error', error: err.message });
    }
  }
};
