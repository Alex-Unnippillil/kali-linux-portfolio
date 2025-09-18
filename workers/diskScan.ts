import {
  DiskNode,
  DiskScanOptions,
  DiskScanRequestMessage,
  DiskScanResponseMessage,
  DiskScanStartMessage,
  pathToId,
} from '@/types/disk';

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

const delay = () => new Promise((resolve) => setTimeout(resolve, 0));

interface ScanState {
  cancelled: boolean;
  options: DiskScanOptions;
  progress: {
    files: number;
    directories: number;
    bytes: number;
    queueSize: number;
    currentPath: string;
    startedAt: number;
    updatedAt: number;
  };
  pendingDirs: number;
}

const initialState = (): ScanState => ({
  cancelled: false,
  options: {},
  progress: {
    files: 0,
    directories: 0,
    bytes: 0,
    queueSize: 0,
    currentPath: '/',
    startedAt: Date.now(),
    updatedAt: Date.now(),
  },
  pendingDirs: 0,
});

let state = initialState();

const reportProgress = (path: string) => {
  state.progress.currentPath = path;
  state.progress.updatedAt = Date.now();
  const message: DiskScanResponseMessage = {
    type: 'progress',
    progress: { ...state.progress },
  };
  ctx.postMessage(message);
};

const createDirectoryNode = (name: string, path: string[]): DiskNode => ({
  id: pathToId(path),
  name,
  path,
  parentId: path.length ? pathToId(path.slice(0, -1)) : null,
  type: 'directory',
  size: 0,
  fileCount: 0,
  dirCount: 0,
  children: [],
});

const createFileNode = (
  name: string,
  path: string[],
  size: number,
  modified?: number,
): DiskNode => ({
  id: pathToId(path),
  name,
  path,
  parentId: path.length ? pathToId(path.slice(0, -1)) : null,
  type: 'file',
  size,
  fileCount: 1,
  dirCount: 0,
  modified,
});

const scanFile = async (
  handle: FileSystemFileHandle,
  parentPath: string[],
): Promise<DiskNode> => {
  let fileSize = 0;
  let modified: number | undefined;
  try {
    const file = await handle.getFile();
    fileSize = file.size ?? 0;
    modified = file.lastModified;
  } catch (error) {
    console.warn('Unable to read file handle', error);
  }
  state.progress.files += 1;
  state.progress.bytes += fileSize;
  return createFileNode(handle.name, [...parentPath, handle.name], fileSize, modified);
};

const iterateDirectory = (
  handle: FileSystemDirectoryHandle,
): AsyncIterable<FileSystemHandle> => {
  if ('values' in handle && typeof handle.values === 'function') {
    return handle.values();
  }
  if ('entries' in handle && typeof handle.entries === 'function') {
    return handle.entries();
  }
  throw new Error('Directory handle does not support iteration');
};

const scanDirectory = async (
  handle: FileSystemDirectoryHandle,
  path: string[],
  depth: number,
): Promise<DiskNode> => {
  if (state.cancelled) {
    return createDirectoryNode(handle.name ?? path[path.length - 1] ?? 'root', path);
  }

  state.pendingDirs += 1;
  state.progress.queueSize = state.pendingDirs;
  state.progress.directories += 1;

  const node = createDirectoryNode(handle.name ?? path[path.length - 1] ?? 'root', path);
  const chunkSize = state.options.chunkSize ?? 48;
  let processedSinceYield = 0;

  try {
    for await (const entry of iterateDirectory(handle)) {
      if (state.cancelled) break;
      const childPath = [...path, entry.name];
      if (entry.kind === 'file') {
        const fileNode = await scanFile(entry as FileSystemFileHandle, path);
        node.children?.push(fileNode);
        node.size += fileNode.size;
        node.fileCount += 1;
      } else if (entry.kind === 'directory') {
        if (state.options.maxDepth !== undefined && depth >= state.options.maxDepth) {
          const placeholder = createDirectoryNode(entry.name, childPath);
          node.children?.push(placeholder);
          node.dirCount += 1;
        } else {
          const childNode = await scanDirectory(entry as FileSystemDirectoryHandle, childPath, depth + 1);
          node.children?.push(childNode);
          node.size += childNode.size;
          node.fileCount += childNode.fileCount;
          node.dirCount += childNode.dirCount + 1;
        }
      }

      processedSinceYield += 1;
      if (processedSinceYield >= chunkSize) {
        reportProgress(pathToId(childPath));
        processedSinceYield = 0;
        await delay();
      }
    }
  } catch (error) {
    console.warn('Failed to read directory', error);
  }

  node.children?.sort((a, b) => b.size - a.size);

  state.pendingDirs -= 1;
  state.progress.queueSize = Math.max(0, state.pendingDirs);

  ctx.postMessage({ type: 'chunk', node } satisfies DiskScanResponseMessage);
  return node;
};

const handleStart = async (message: DiskScanStartMessage) => {
  state = initialState();
  state.options = message.options ?? {};
  state.progress.startedAt = Date.now();
  state.progress.updatedAt = state.progress.startedAt;
  state.cancelled = false;

  if (message.snapshot) {
    const progressSnapshot = {
      ...state.progress,
      files: message.snapshot.fileCount,
      directories: message.snapshot.dirCount + 1,
      bytes: message.snapshot.size,
      currentPath: pathToId(message.snapshot.path),
      updatedAt: Date.now(),
    };
    const completeMessage: DiskScanResponseMessage = {
      type: 'complete',
      root: message.snapshot,
      progress: progressSnapshot,
    };
    ctx.postMessage(completeMessage);
    return;
  }

  if (!message.handle) {
    ctx.postMessage({ type: 'error', error: 'No directory handle provided' } satisfies DiskScanResponseMessage);
    return;
  }

  try {
    const rootNode = await scanDirectory(message.handle, [], 0);
    if (state.cancelled) {
      ctx.postMessage({ type: 'cancelled' } satisfies DiskScanResponseMessage);
      return;
    }
    reportProgress(pathToId(rootNode.path));
    const completeMessage: DiskScanResponseMessage = {
      type: 'complete',
      root: rootNode,
      progress: { ...state.progress },
    };
    ctx.postMessage(completeMessage);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    ctx.postMessage({ type: 'error', error: err.message } satisfies DiskScanResponseMessage);
  }
};

ctx.onmessage = (event: MessageEvent<DiskScanRequestMessage>) => {
  const message = event.data;
  if (!message) return;
  if (message.type === 'cancel') {
    state.cancelled = true;
    return;
  }
  if (message.type === 'start') {
    handleStart(message).catch((error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      ctx.postMessage({ type: 'error', error: err.message } satisfies DiskScanResponseMessage);
    });
  }
};

export {};
