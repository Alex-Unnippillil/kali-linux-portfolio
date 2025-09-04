import { isBrowser } from './isBrowser';

const FILE_NAME = 'notes.json';
const STORAGE_KEY = 'notes';

type StorageWithDirectory = StorageManager & {
  getDirectory?: () => Promise<FileSystemDirectoryHandle>;
};

const getStorage = (): StorageWithDirectory =>
  navigator.storage as StorageWithDirectory;

const hasOpfs =
  isBrowser && 'storage' in navigator && typeof getStorage().getDirectory === 'function';

export interface StoredNote {
  id: string;
  text: string;
  tags: string[];
}

export const loadNotes = async (): Promise<StoredNote[]> => {
  if (!isBrowser) return [];
  if (hasOpfs) {
    try {
      const root = await getStorage().getDirectory!();
      const handle = await root.getFileHandle(FILE_NAME);
      const file = await handle.getFile();
      return JSON.parse(await file.text());
    } catch {
      return [];
    }
  }
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
};

export const saveNotes = async (notes: StoredNote[]): Promise<void> => {
  if (!isBrowser) return;
  if (hasOpfs) {
    const root = await getStorage().getDirectory!();
    const handle = await root.getFileHandle(FILE_NAME, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(notes));
    await writable.close();
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
};

export const exportNotes = async (): Promise<string> => {
  const notes = await loadNotes();
  return JSON.stringify(notes);
};

export const importNotes = async (json: string): Promise<StoredNote[]> => {
  try {
    const notes = JSON.parse(json);
    if (Array.isArray(notes)) {
      await saveNotes(notes);
      return notes as StoredNote[];
    }
  } catch {
    /* ignore */
  }
  return [];
};

const api = { loadNotes, saveNotes, exportNotes, importNotes };

export default api;
