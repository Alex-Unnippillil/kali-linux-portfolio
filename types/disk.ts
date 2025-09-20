export type DiskEntryKind = 'file' | 'directory';

export interface DiskNode {
  id: string;
  name: string;
  path: string[];
  parentId: string | null;
  type: DiskEntryKind;
  size: number;
  children?: DiskNode[];
  fileCount: number;
  dirCount: number;
  modified?: number;
}

export interface DiskScanOptions {
  maxDepth?: number;
  followSymlinks?: boolean;
  chunkSize?: number;
}

export interface DiskScanProgress {
  files: number;
  directories: number;
  bytes: number;
  queueSize: number;
  currentPath: string;
  startedAt: number;
  updatedAt: number;
}

export interface DiskScanStartMessage {
  type: 'start';
  handle?: FileSystemDirectoryHandle;
  snapshot?: DiskNode;
  options?: DiskScanOptions;
}

export interface DiskScanCancelMessage {
  type: 'cancel';
}

export type DiskScanRequestMessage = DiskScanStartMessage | DiskScanCancelMessage;

export type DiskScanResponseMessage =
  | { type: 'progress'; progress: DiskScanProgress }
  | { type: 'chunk'; node: DiskNode }
  | { type: 'complete'; root: DiskNode; progress: DiskScanProgress }
  | { type: 'cancelled' }
  | { type: 'error'; error: string };

export const pathToId = (segments: string[]): string =>
  segments.length ? `/${segments.join('/')}` : '/';
