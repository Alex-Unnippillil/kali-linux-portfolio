import { getDb } from '../../../utils/safeIDB';

const DB_NAME = 'figlet-fonts';
const STORE_NAME = 'fonts';

async function openFontDb() {
  return getDb(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    },
  });
}

export async function loadCachedFonts() {
  const db = await openFontDb();
  if (!db) return [];
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.store || tx.objectStore(STORE_NAME);
  const [keys, values] = await Promise.all([
    store.getAllKeys(),
    store.getAll(),
  ]);
  await tx.done;
  return keys.map((name, index) => ({ name, data: values[index] }));
}

export async function cacheFont(name, data) {
  if (!name || !data) return;
  const db = await openFontDb();
  if (!db) return;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.store || tx.objectStore(STORE_NAME);
  await store.put(data, name);
  await tx.done;
}

export async function removeCachedFont(name) {
  if (!name) return;
  const db = await openFontDb();
  if (!db) return;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.store || tx.objectStore(STORE_NAME);
  await store.delete(name);
  await tx.done;
}

export async function clearFontCache() {
  const db = await openFontDb();
  if (!db) return;
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.store || tx.objectStore(STORE_NAME);
  await store.clear();
  await tx.done;
}

export const FONT_CACHE_DB = DB_NAME;
export const FONT_CACHE_STORE = STORE_NAME;
