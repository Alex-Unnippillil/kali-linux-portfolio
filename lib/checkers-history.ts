import type { Board } from '@apps/checkers/engine';

const DB_NAME = 'checkers-history';
const STORE_NAME = 'matches';

interface HistoryEntry {
  board: Board;
  turn: string;
  no: number;
}

interface MatchRecord {
  timestamp: number;
  history: HistoryEntry[];
}

const openDB = () =>
  new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE_NAME, {
        autoIncrement: true,
      });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const saveMatch = async (history: HistoryEntry[]) => {
  if (typeof indexedDB === 'undefined') return;
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).add({ timestamp: Date.now(), history } as MatchRecord);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
};
