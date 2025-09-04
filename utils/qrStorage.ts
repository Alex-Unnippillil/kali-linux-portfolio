import { isBrowser } from './isBrowser';

const STORAGE_KEY = 'qrScans';
const LAST_SCAN_KEY = 'qrLastScan';
const LAST_GEN_KEY = 'qrLastGeneration';
const FILE_NAME = 'qr-scans.json';

export interface QRScan {
  data: string;
  annotation: string;
}

type StorageWithDirectory = StorageManager & {
  // TODO: refine type when File System Access API types are finalized
  getDirectory: () => Promise<FileSystemDirectoryHandle>;
};

const getStorage = (): StorageWithDirectory =>
  navigator.storage as StorageWithDirectory;

const hasOpfs =
  isBrowser && 'storage' in navigator && Boolean(getStorage().getDirectory);

const parseScans = (raw: string | null): QRScan[] => {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (Array.isArray(arr)) {
      return arr.map((item: any) =>
        typeof item === 'string'
          ? { data: item, annotation: '' }
          : {
              data: String(item.data ?? ''),
              annotation: String(item.annotation ?? ''),
            },
      );
    }
    return [];
  } catch {
    return [];
  }
};

export const loadScans = async (): Promise<QRScan[]> => {
  if (!isBrowser) return [];
  if (hasOpfs) {
    try {
      const root = await getStorage().getDirectory();
      const handle = await root.getFileHandle(FILE_NAME);
      const file = await handle.getFile();
      return parseScans(await file.text());
    } catch {
      return [];
    }
  }
  return parseScans(localStorage.getItem(STORAGE_KEY));
};

export const saveScans = async (scans: QRScan[]): Promise<void> => {
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
