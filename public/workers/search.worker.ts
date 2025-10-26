const ctx: DedicatedWorkerGlobalScope = self as DedicatedWorkerGlobalScope;

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 200;
const ROOT_LABEL = '(root)';

export type SearchWorkerCountMessage = {
  type: 'count';
  files: string[];
  query?: string;
  limit?: number;
  requestId?: number;
};

export type SearchWorkerCancelMessage = {
  type: 'cancel';
  requestId?: number;
};

export type SearchWorkerMessage =
  | SearchWorkerCountMessage
  | SearchWorkerCancelMessage;

export type SearchWorkerResultMessage = {
  type: 'result';
  requestId: number;
  total: number;
  matches: string[];
  directories: Array<{ name: string; count: number }>;
  extensions: Array<{ name: string; count: number }>;
};

export type SearchWorkerErrorMessage = {
  type: 'error';
  requestId: number;
  message: string;
};

const cancelledRequests = new Set<number>();

const sanitizeFiles = (files: unknown): string[] => {
  if (!Array.isArray(files)) return [];
  return files.filter((file): file is string => typeof file === 'string');
};

const normalizeLimit = (value: unknown): number => {
  if (typeof value !== 'number' || Number.isNaN(value)) return DEFAULT_LIMIT;
  const limit = Math.floor(value);
  if (limit < 0) return 0;
  return Math.min(limit, MAX_LIMIT);
};

const toDirectory = (path: string): string => {
  const parts = path.split(/[\\/]/).filter(Boolean);
  if (parts.length <= 1) return ROOT_LABEL;
  return parts[parts.length - 2] ?? ROOT_LABEL;
};

const toExtension = (path: string): string => {
  const filename = path.split(/[\\/]/).pop() ?? path;
  const dotIndex = filename.lastIndexOf('.');
  if (dotIndex <= 0 || dotIndex === filename.length - 1) return '(no ext)';
  return filename.slice(dotIndex + 1).toLowerCase();
};

const sortCounts = (
  map: Map<string, number>,
): Array<{ name: string; count: number }> =>
  Array.from(map.entries())
    .sort((a, b) => {
      if (b[1] === a[1]) {
        return a[0].localeCompare(b[0]);
      }
      return b[1] - a[1];
    })
    .map(([name, count]) => ({ name, count }));

ctx.onmessage = (event: MessageEvent<SearchWorkerMessage>) => {
  const message = event.data;

  if (!message || typeof message !== 'object') {
    ctx.postMessage({
      type: 'error',
      requestId: 0,
      message: 'Invalid worker message received',
    } satisfies SearchWorkerErrorMessage);
    return;
  }

  if (message.type === 'cancel') {
    if (typeof message.requestId === 'number') {
      cancelledRequests.add(message.requestId);
    }
    return;
  }

  if (message.type !== 'count') {
    ctx.postMessage({
      type: 'error',
      requestId: message.requestId ?? 0,
      message: `Unsupported worker message: ${String(message.type)}`,
    } satisfies SearchWorkerErrorMessage);
    return;
  }

  const requestId = message.requestId ?? 0;
  if (cancelledRequests.has(requestId)) {
    cancelledRequests.delete(requestId);
    return;
  }

  const files = sanitizeFiles(message.files);
  const limit = normalizeLimit(message.limit);
  const query = (message.query ?? '').trim().toLowerCase();

  const matches =
    query.length === 0
      ? files.slice()
      : files.filter((file) => file.toLowerCase().includes(query));

  const total = matches.length;
  const limitedMatches = limit > 0 ? matches.slice(0, limit) : [];

  const directoryCounts = new Map<string, number>();
  const extensionCounts = new Map<string, number>();

  for (const file of matches) {
    const directory = toDirectory(file);
    const extension = toExtension(file);
    directoryCounts.set(directory, (directoryCounts.get(directory) ?? 0) + 1);
    extensionCounts.set(extension, (extensionCounts.get(extension) ?? 0) + 1);
  }

  const response: SearchWorkerResultMessage = {
    type: 'result',
    requestId,
    total,
    matches: limitedMatches,
    directories: sortCounts(directoryCounts),
    extensions: sortCounts(extensionCounts),
  };

  ctx.postMessage(response);
};

export {}; // ensure module scope
