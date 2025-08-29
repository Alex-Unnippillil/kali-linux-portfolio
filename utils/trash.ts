import { saveSlot } from '../components/apps/Games/common/save';

export interface TrashItem {
  id: string;
  name: string;
  type: string;
  deletedAt: number;
  meta?: Record<string, unknown>;
}

const TRASH_DIR = 'trash';
const META_FILE = 'metadata.json';
let purgeTimer: number | null = null;

async function getTrashDir(): Promise<FileSystemDirectoryHandle> {
  const root = await navigator.storage.getDirectory();
  return root.getDirectoryHandle(TRASH_DIR, { create: true });
}

async function readMetadata(): Promise<TrashItem[]> {
  try {
    const dir = await getTrashDir();
    const handle = await dir.getFileHandle(META_FILE);
    const file = await handle.getFile();
    return JSON.parse(await file.text());
  } catch {
    return [];
  }
}

async function writeMetadata(items: TrashItem[]): Promise<void> {
  const dir = await getTrashDir();
  const handle = await dir.getFileHandle(META_FILE, { create: true });
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(items));
  await writable.close();
}

export async function purgeOldTrash(purgeDays = 30): Promise<void> {
  const threshold = Date.now() - purgeDays * 24 * 60 * 60 * 1000;
  const dir = await getTrashDir();
  const items = await readMetadata();
  const keep: TrashItem[] = [];
  for (const item of items) {
    if (item.deletedAt < threshold) {
      try {
        await dir.removeEntry(item.id);
      } catch {}
    } else {
      keep.push(item);
    }
  }
  await writeMetadata(keep);
}

function ensurePurgeJob() {
  if (purgeTimer !== null) return;
  purgeTimer = window.setInterval(() => {
    purgeOldTrash().catch(() => {});
  }, 24 * 60 * 60 * 1000);
}

export async function listTrash(): Promise<TrashItem[]> {
  ensurePurgeJob();
  await purgeOldTrash();
  return readMetadata();
}

export async function addFileToTrash(
  name: string,
  blob: Blob,
  meta: Record<string, unknown> = {}
): Promise<void> {
  ensurePurgeJob();
  await purgeOldTrash();
  const dir = await getTrashDir();
  const id = `${Date.now()}-${name}`;
  const fileHandle = await dir.getFileHandle(id, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
  const items = await readMetadata();
  items.push({ id, name, type: (meta.type as string) || 'file', deletedAt: Date.now(), meta });
  await writeMetadata(items);
}

export async function trashSave(
  gameId: string,
  slot: string,
  data: unknown
): Promise<void> {
  const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
  await addFileToTrash(`${gameId}-${slot}.json`, blob, { type: 'save', gameId, slot });
}

export async function restoreItem(item: TrashItem): Promise<void> {
  const dir = await getTrashDir();
  const fileHandle = await dir.getFileHandle(item.id);
  const file = await fileHandle.getFile();
  if (item.type === 'save') {
    const { gameId, slot } = item.meta as { gameId: string; slot: string };
    const text = await file.text();
    await saveSlot(gameId, { name: slot, data: JSON.parse(text) });
  } else if (item.meta && typeof item.meta['path'] === 'string') {
    const root = await navigator.storage.getDirectory();
    const parts = (item.meta['path'] as string).split('/').filter(Boolean);
    let targetDir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      targetDir = await targetDir.getDirectoryHandle(parts[i], { create: true });
    }
    const target = await targetDir.getFileHandle(parts[parts.length - 1], { create: true });
    const writable = await target.createWritable();
    await writable.write(await file.arrayBuffer());
    await writable.close();
  }
  await dir.removeEntry(item.id);
  const items = await readMetadata();
  await writeMetadata(items.filter((i) => i.id !== item.id));
}

export async function deleteForever(item: TrashItem): Promise<void> {
  const dir = await getTrashDir();
  try {
    await dir.removeEntry(item.id);
  } catch {}
  const items = await readMetadata();
  await writeMetadata(items.filter((i) => i.id !== item.id));
}

export default {
  listTrash,
  addFileToTrash,
  trashSave,
  restoreItem,
  deleteForever,
  purgeOldTrash,
};

