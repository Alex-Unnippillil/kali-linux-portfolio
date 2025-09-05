import { safeLocalStorage } from './safeStorage';
import { publish, subscribe } from './pubsub';

export interface RecentFile {
  path: string;
  name: string;
  lastOpened: number;
}

const STORAGE_KEY = 'recent-files';
const MAX_ITEMS = 20;

function read(): RecentFile[] {
  if (!safeLocalStorage) return [];
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentFile[]) : [];
  } catch {
    return [];
  }
}

function write(list: RecentFile[]): void {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

export function getRecentFiles(): RecentFile[] {
  return read();
}

export function addRecentFile(file: { path: string; name: string }): void {
  const list = read().filter((f) => f.path !== file.path);
  list.unshift({ ...file, lastOpened: Date.now() });
  if (list.length > MAX_ITEMS) list.length = MAX_ITEMS;
  write(list);
  publish('recent-files:update', list);
}

export function clearRecentFiles(): void {
  write([]);
  publish('recent-files:update', []);
}

export function onRecentFilesChange(
  cb: (files: RecentFile[]) => void,
): () => void {
  cb(read());
  return subscribe('recent-files:update', (files) => {
    cb(files as RecentFile[]);
  });
}

const api = {
  getRecentFiles,
  addRecentFile,
  clearRecentFiles,
  onRecentFilesChange,
};

if (typeof globalThis !== 'undefined') {
  (globalThis as any).recentFiles = api;
}

export default api;
