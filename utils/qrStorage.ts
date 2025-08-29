const STORAGE_KEY = 'qrScans';
const FILE_NAME = 'qr-scans.json';

const hasOpfs =
  typeof window !== 'undefined' &&
  'storage' in navigator &&
  Boolean((navigator.storage as any).getDirectory);

export const loadScans = async (): Promise<string[]> => {
  if (typeof window === 'undefined') return [];
  if (hasOpfs) {
    try {
      const root = await (navigator.storage as any).getDirectory();
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
  if (typeof window === 'undefined') return;
  if (hasOpfs) {
    const root = await (navigator.storage as any).getDirectory();
    const handle = await root.getFileHandle(FILE_NAME, { create: true });
    const writable = await handle.createWritable();
    await writable.write(JSON.stringify(scans));
    await writable.close();
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(scans));
};

export const clearScans = async (): Promise<void> => {
  if (typeof window === 'undefined') return;
  if (hasOpfs) {
    try {
      const root = await (navigator.storage as any).getDirectory();
      await root.removeEntry(FILE_NAME);
    } catch {
      /* ignore */
    }
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
};
