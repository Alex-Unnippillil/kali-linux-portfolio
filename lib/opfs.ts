const PATH_SEPARATOR = '/';

export type OPFSWriteData = string | Blob | ArrayBuffer | ArrayBufferView;

type NavigatorWithOPFS = Navigator & {
  storage?: StorageManager & {
    getDirectory?: () => Promise<FileSystemDirectoryHandle>;
  };
};

function getNavigatorWithOPFS(): NavigatorWithOPFS | null {
  if (typeof navigator === 'undefined') {
    return null;
  }
  return navigator as NavigatorWithOPFS;
}

function sanitizePath(path: string): string[] {
  return path
    .split(PATH_SEPARATOR)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && segment !== '.')
    .map((segment) => {
      if (segment === '..') {
        throw new Error('Parent directory segments are not allowed in OPFS paths.');
      }
      return segment;
    });
}

async function getOPFSRoot(): Promise<FileSystemDirectoryHandle> {
  const nav = getNavigatorWithOPFS();
  const storageManager = nav?.storage;

  if (!storageManager?.getDirectory) {
    throw new Error('OPFS is not supported in this environment.');
  }

  const root = await storageManager.getDirectory();
  return root as FileSystemDirectoryHandle;
}

export async function saveToOPFS(
  path: string,
  data: OPFSWriteData,
): Promise<FileSystemFileHandle> {
  if (!path || typeof path !== 'string') {
    throw new Error('A valid file path is required to save to OPFS.');
  }

  const parts = sanitizePath(path);
  if (parts.length === 0) {
    throw new Error('The provided path does not include a file name.');
  }

  const fileName = parts.pop() as string;
  const root = await getOPFSRoot();

  let currentDir = root;
  for (const segment of parts) {
    currentDir = await currentDir.getDirectoryHandle(segment, { create: true });
  }

  const fileHandle = await currentDir.getFileHandle(fileName, { create: true });
  const writable = await fileHandle.createWritable();

  let writeError: unknown = null;
  try {
    await writable.write(data as any);
  } catch (error) {
    writeError = error;
  }

  try {
    await writable.close();
  } catch (closeError) {
    if (!writeError) {
      throw closeError;
    }
  }

  if (writeError) {
    throw writeError;
  }

  return fileHandle;
}

export async function readFromOPFS(path: string): Promise<string | null> {
  if (!path || typeof path !== 'string') {
    throw new Error('A valid file path is required to read from OPFS.');
  }

  const parts = sanitizePath(path);
  if (parts.length === 0) {
    throw new Error('The provided path does not include a file name.');
  }

  const fileName = parts.pop() as string;
  const root = await getOPFSRoot();

  let currentDir = root;
  for (const segment of parts) {
    currentDir = await currentDir.getDirectoryHandle(segment, { create: false });
  }

  try {
    const fileHandle = await currentDir.getFileHandle(fileName, { create: false });
    const file = await fileHandle.getFile();
    return await file.text();
  } catch {
    return null;
  }
}

export async function ensureDirectory(
  path: string,
): Promise<FileSystemDirectoryHandle> {
  const parts = sanitizePath(path);
  const root = await getOPFSRoot();
  let currentDir = root;
  for (const segment of parts) {
    currentDir = await currentDir.getDirectoryHandle(segment, { create: true });
  }
  return currentDir;
}
