import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;

self.onmessage = async (e: MessageEvent) => {
  const msg = e.data as any;
  if (msg.type === 'init') {
    const SQL = await initSqlJs({
      locateFile: (file: string) => `https://cdnjs.cloudflare.com/ajax/libs/sql.js/1.13.0/${file}`,
    });
    db = new SQL.Database(new Uint8Array(msg.buffer));
    // Stream schema: post each table name
    const stmt = db.prepare("SELECT name FROM sqlite_schema WHERE type IN ('table','view') ORDER BY name");
    while (stmt.step()) {
      const row = stmt.getAsObject();
      (self as any).postMessage({ type: 'schema', table: row.name });
    }
    stmt.free();
    (self as any).postMessage({ type: 'ready' });
  } else if (msg.type === 'exec') {
    if (!db) {
      (self as any).postMessage({ type: 'error', error: 'DB not initialized' });
      return;
    }
    try {
      const { query, limit, offset } = msg;
      const stmt = db.prepare(query);
      const cols = stmt.getColumnNames();
      let skipped = 0;
      while (skipped < offset && stmt.step()) skipped++;
      const rows: any[] = [];
      let count = 0;
      while (stmt.step()) {
        rows.push(stmt.get());
        count++;
        if (count >= limit) break;
      }
      stmt.free();
      (self as any).postMessage({ type: 'result', columns: cols, rows });
    } catch (err: any) {
      (self as any).postMessage({ type: 'error', error: err.message });
    }
  }
};
