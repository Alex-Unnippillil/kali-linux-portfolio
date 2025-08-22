const DB_NAME = 'solitaire';
const DB_VERSION = 1;
const GAME_STORE = 'games';
const STATS_STORE = 'stats';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(GAME_STORE)) {
        db.createObjectStore(GAME_STORE, { keyPath: 'variant' });
      }
      if (!db.objectStoreNames.contains(STATS_STORE)) {
        db.createObjectStore(STATS_STORE, { keyPath: 'variant' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveGame(variant: string, state: unknown): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(GAME_STORE, 'readwrite');
  tx.objectStore(GAME_STORE).put({ variant, state });
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(undefined);
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadGame<T>(variant: string): Promise<T | undefined> {
  const db = await openDB();
  const tx = db.transaction(GAME_STORE, 'readonly');
  const req = tx.objectStore(GAME_STORE).get(variant);
  const res: any = await new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
  db.close();
  return res?.state as T | undefined;
}

export async function recordResult(variant: string, won: boolean): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STATS_STORE, 'readwrite');
  const store = tx.objectStore(STATS_STORE);
  const current: any = await new Promise((resolve) => {
    const r = store.get(variant);
    r.onsuccess = () => resolve(r.result || { variant, wins: 0, losses: 0, streak: 0 });
    r.onerror = () => resolve({ variant, wins: 0, losses: 0, streak: 0 });
  });
  if (won) {
    current.wins += 1;
    current.streak = current.streak >= 0 ? current.streak + 1 : 1;
  } else {
    current.losses += 1;
    current.streak = current.streak <= 0 ? current.streak - 1 : -1;
  }
  store.put(current);
  await new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(undefined);
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getStats(variant: string): Promise<{ wins: number; losses: number; streak: number }> {
  const db = await openDB();
  const tx = db.transaction(STATS_STORE, 'readonly');
  const req = tx.objectStore(STATS_STORE).get(variant);
  const res: any = await new Promise((resolve) => {
    req.onsuccess = () => resolve(req.result || { wins: 0, losses: 0, streak: 0 });
    req.onerror = () => resolve({ wins: 0, losses: 0, streak: 0 });
  });
  db.close();
  return res;
}
