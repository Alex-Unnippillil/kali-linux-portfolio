const DB_NAME = 'session-db';
const STORE = 'windows';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

self.onmessage = async ({ data }) => {
  const { type, windows } = data || {};
  if (type === 'save' && Array.isArray(windows)) {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(windows, 'session');
      tx.oncomplete = () => db.close();
      tx.onerror = () => db.close();
    } catch {
      // ignore
    }
  } else if (type === 'load') {
    try {
      const db = await openDB();
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get('session');
      req.onsuccess = () => {
        self.postMessage({ type: 'session', windows: req.result || [] });
        db.close();
      };
      req.onerror = () => {
        self.postMessage({ type: 'session', windows: [] });
        db.close();
      };
    } catch {
      self.postMessage({ type: 'session', windows: [] });
    }
  }
};

export {};
