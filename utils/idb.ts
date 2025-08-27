const DB_NAME = 'kali-games';
const VERSION = 1;
const STORE_SEEDS = 'seeds';
const STORE_REPLAYS = 'replays';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_SEEDS)) {
        db.createObjectStore(STORE_SEEDS);
      }
      if (!db.objectStoreNames.contains(STORE_REPLAYS)) {
        db.createObjectStore(STORE_REPLAYS);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getSeed(game: string, date: string): Promise<string | undefined> {
  try {
    const db = await openDB();
    return await new Promise((resolve) => {
      const tx = db.transaction(STORE_SEEDS, 'readonly');
      const store = tx.objectStore(STORE_SEEDS);
      const req = store.get(`${game}-${date}`);
      req.onsuccess = () => resolve(req.result as string | undefined);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

export async function setSeed(game: string, date: string, seed: string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_SEEDS, 'readwrite');
      tx.objectStore(STORE_SEEDS).put(seed, `${game}-${date}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function saveReplay(game: string, id: string, data: any): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_REPLAYS, 'readwrite');
      tx.objectStore(STORE_REPLAYS).put(data, `${game}-${id}`);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {
    // ignore
  }
}

export async function getReplay<T = any>(game: string, id: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return await new Promise<T | undefined>((resolve) => {
      const tx = db.transaction(STORE_REPLAYS, 'readonly');
      const req = tx.objectStore(STORE_REPLAYS).get(`${game}-${id}`);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}

