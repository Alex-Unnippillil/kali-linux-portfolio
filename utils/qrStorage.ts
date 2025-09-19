import { isBrowser } from './isBrowser';

const STORAGE_KEY = 'qrScans';
const LAST_SCAN_KEY = 'qrLastScan';
const LAST_GEN_KEY = 'qrLastGeneration';
const FILE_NAME = 'qr-scans.json';

const getStorage = (): StorageManager => navigator.storage;

const hasOpfs =
  isBrowser && 'storage' in navigator && Boolean(getStorage().getDirectory);

const safeRemoveItem = (key: string): void => {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.warn(`[qrStorage] Failed to remove ${key} from localStorage`, error);
  }
};

const safeSetItem = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[qrStorage] Failed to persist ${key} to localStorage`, error);
    safeRemoveItem(key);
  }
};

const cleanupOpfsFile = async (): Promise<void> => {
  try {
    const root = await getStorage().getDirectory();
    await root.removeEntry(FILE_NAME);
  } catch (error) {
    const domError = error as DOMException | undefined;
    if (domError?.name === 'NotFoundError') {
      return;
    }
    // Removing the entry is a best-effort attempt. Ignore missing handles but
    // surface unexpected failures for manual debugging.
    console.warn('[qrStorage] Failed to clean up OPFS entry', error);
  }
};

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
    let writable: FileSystemWritableFileStream | null = null;
    try {
      const root = await getStorage().getDirectory();
      const handle = await root.getFileHandle(FILE_NAME, { create: true });
      writable = await handle.createWritable();
      await writable.write(JSON.stringify(scans));
      await writable.close();
      return;
    } catch (error) {
      if (writable) {
        try {
          if (typeof writable.abort === 'function') {
            await writable.abort();
          } else {
            await writable.close();
          }
        } catch (abortError) {
          console.warn('[qrStorage] Failed to abort OPFS write', abortError);
        }
      }
      console.warn('[qrStorage] Failed to persist scans via OPFS', error);
      await cleanupOpfsFile();
    }
  }
  safeSetItem(STORAGE_KEY, JSON.stringify(scans));
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
  safeRemoveItem(STORAGE_KEY);
};

export const loadLastScan = (): string => {
  if (!isBrowser) return '';
  return localStorage.getItem(LAST_SCAN_KEY) || '';
};

export const saveLastScan = (scan: string): void => {
  if (!isBrowser) return;
  safeSetItem(LAST_SCAN_KEY, scan);
};

export const loadLastGeneration = (): string => {
  if (!isBrowser) return '';
  return localStorage.getItem(LAST_GEN_KEY) || '';
};

export const saveLastGeneration = (payload: string): void => {
  if (!isBrowser) return;
  safeSetItem(LAST_GEN_KEY, payload);
};
