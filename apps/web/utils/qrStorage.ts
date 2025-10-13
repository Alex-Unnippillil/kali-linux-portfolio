import { isBrowser } from './isBrowser';

const STORAGE_KEY = 'qrScans';
const LAST_SCAN_KEY = 'qrLastScan';
const LAST_GEN_KEY = 'qrLastGeneration';
const FILE_NAME = 'qr-scans.json';

const getStorage = (): StorageManager => navigator.storage;

const hasOpfs =
  isBrowser && 'storage' in navigator && Boolean(getStorage().getDirectory);

export const loadScans = async (): Promise<string[]> => {
  if (!isBrowser) return [];
  if (hasOpfs) {
    try {
      const root = await getStorage().getDirectory();
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

export const saveScans = async (scans: string[]): Promise<void> => {
  if (!isBrowser) return;
  if (hasOpfs) {
    const root = await getStorage().getDirectory();
    const handle = await root.getFileHandle(FILE_NAME, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(scans));
    await writable.close();
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
};

export const clearScans = async (): Promise<void> => {
  if (!isBrowser) return;
  if (hasOpfs) {
    try {
      const root = await getStorage().getDirectory();
      await root.removeEntry(FILE_NAME);
    } catch {
      /* ignore */
    }
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
};

export const loadLastScan = (): string => {
  if (!isBrowser) return '';
  return localStorage.getItem(LAST_SCAN_KEY) || '';
};

export const saveLastScan = (scan: string): void => {
  if (!isBrowser) return;
  localStorage.setItem(LAST_SCAN_KEY, scan);
};

export const loadLastGeneration = (): string => {
  if (!isBrowser) return '';
  return localStorage.getItem(LAST_GEN_KEY) || '';
};

export const saveLastGeneration = (payload: string): void => {
  if (!isBrowser) return;
  localStorage.setItem(LAST_GEN_KEY, payload);
};
