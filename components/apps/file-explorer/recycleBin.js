export const BIN_STORE = 'bin';

function sortEntries(entries = []) {
  return [...entries].sort((a, b) => (b.deletedAt || 0) - (a.deletedAt || 0));
}

export async function loadBinEntries(dbPromise) {
  if (!dbPromise) return [];
  try {
    const db = await dbPromise;
    const entries = await db.getAll(BIN_STORE);
    return sortEntries(entries || []);
  } catch {
    return [];
  }
}

async function writeToHandle(handle, data) {
  const writable = await handle.createWritable();
  await writable.write(data);
  await writable.close();
}

export async function persistSoftDelete({
  fileEntry,
  directoryHandle,
  recycleDir,
  dbPromise,
  pathSegments = [],
  now = Date.now(),
  makeId = () => (globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${now}-${Math.random()}`),
}) {
  if (!fileEntry?.handle || !directoryHandle || !recycleDir || !dbPromise) {
    throw new Error('Recycle bin unavailable');
  }
  const db = await dbPromise;
  const sourceFile = await fileEntry.handle.getFile();
  const id = makeId();
  const binFileName = `${id}-${fileEntry.name}`;
  const binHandle = await recycleDir.getFileHandle(binFileName, { create: true });
  await writeToHandle(binHandle, sourceFile);
  try {
    await directoryHandle.removeEntry(fileEntry.name);
  } catch (err) {
    await recycleDir.removeEntry(binFileName).catch(() => {});
    throw err;
  }
  const path = [...pathSegments.filter(Boolean), fileEntry.name].join('/');
  const entry = {
    id,
    name: fileEntry.name,
    originalPath: path,
    directoryHandle,
    deletedAt: now,
    size: sourceFile.size || 0,
    binFileName,
  };
  await db.put(BIN_STORE, entry);
  return entry;
}

export async function restoreEntry(entry, { recycleDir, dbPromise }) {
  if (!entry || !recycleDir || !dbPromise) throw new Error('Recycle bin unavailable');
  const db = await dbPromise;
  const targetDir = entry.directoryHandle;
  if (!targetDir) throw new Error('Missing original directory');
  if (targetDir.requestPermission) {
    const perm = await targetDir.requestPermission({ mode: 'readwrite' });
    if (perm !== 'granted') throw new Error('Permission denied');
  }
  const binHandle = await recycleDir.getFileHandle(entry.binFileName);
  const data = await binHandle.getFile();
  const destHandle = await targetDir.getFileHandle(entry.name, { create: true });
  await writeToHandle(destHandle, data);
  await recycleDir.removeEntry(entry.binFileName).catch(() => {});
  await db.delete(BIN_STORE, entry.id);
  return true;
}

export async function removeEntry(entry, { recycleDir, dbPromise }) {
  if (!entry || !recycleDir || !dbPromise) throw new Error('Recycle bin unavailable');
  const db = await dbPromise;
  await recycleDir.removeEntry(entry.binFileName).catch(() => {});
  await db.delete(BIN_STORE, entry.id);
  return true;
}

export async function emptyBin({ recycleDir, dbPromise }) {
  if (!recycleDir || !dbPromise) throw new Error('Recycle bin unavailable');
  const db = await dbPromise;
  const entries = await db.getAll(BIN_STORE);
  await Promise.all(
    (entries || []).map(async (entry) => {
      await recycleDir.removeEntry(entry.binFileName).catch(() => {});
      await db.delete(BIN_STORE, entry.id);
    }),
  );
  return true;
}

export async function purgeExpiredEntries({ recycleDir, dbPromise, retentionMs, now = Date.now() }) {
  if (!dbPromise) return { purged: [], remaining: [] };
  const db = await dbPromise;
  const entries = (await db.getAll(BIN_STORE)) || [];
  if (!entries.length) return { purged: [], remaining: [] };
  const expired = entries.filter((entry) => now - (entry.deletedAt || 0) > retentionMs);
  await Promise.all(
    expired.map(async (entry) => {
      if (recycleDir) {
        await recycleDir.removeEntry(entry.binFileName).catch(() => {});
      }
      await db.delete(BIN_STORE, entry.id);
    }),
  );
  const remaining = entries.filter((entry) => !expired.includes(entry));
  return { purged: expired, remaining: sortEntries(remaining) };
}
