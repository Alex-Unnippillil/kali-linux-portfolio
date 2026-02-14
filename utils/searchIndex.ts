import appsSnapshot from '../data/search/apps.json';
import filesSnapshot from '../data/search/files.json';
import helpSnapshot from '../data/search/help.json';
import settingsSnapshot from '../data/search/settings.json';
import { isBrowser } from './isBrowser';

import type {
  SearchIndexRequest,
  SearchIndexResponse,
  SearchRecord,
  SearchResult,
  SearchSource,
} from '../workers/search-index.worker';

type IdleDeadlineShim = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type IdleCallback = (deadline: IdleDeadlineShim) => void;

export type SearchQueryOptions = {
  signal?: AbortSignal;
  limit?: number;
  sources?: SearchSource[];
};

interface PendingQuery {
  resolve: (value: SearchResult[]) => void;
  reject: (reason?: unknown) => void;
  signal?: AbortSignal;
  abortListener?: () => void;
}

const staticSnapshots: Record<SearchSource, SearchRecord[]> = {
  apps: appsSnapshot as SearchRecord[],
  settings: settingsSnapshot as SearchRecord[],
  files: filesSnapshot as SearchRecord[],
  help: helpSnapshot as SearchRecord[],
};

function createAbortError(): Error {
  if (typeof DOMException !== 'undefined') {
    return new DOMException('Query aborted', 'AbortError');
  }
  const error = new Error('Query aborted');
  error.name = 'AbortError';
  return error;
}

function toError(reason: unknown): Error {
  if (reason instanceof Error) {
    return reason;
  }
  return new Error(typeof reason === 'string' ? reason : JSON.stringify(reason));
}

class SearchIndexClient {
  private worker?: Worker;

  private ready: Promise<void>;

  private pending = new Map<number, PendingQuery>();

  private requestId = 0;

  constructor() {
    if (isBrowser && typeof Worker === 'function') {
      this.worker = new Worker(new URL('../workers/search-index.worker.ts', import.meta.url));
      this.worker.onmessage = this.handleMessage;
      this.worker.onerror = this.handleWorkerError;
      this.ready = this.bootstrap();
    } else {
      this.ready = Promise.resolve();
    }
  }

  async query(query: string, options: SearchQueryOptions = {}): Promise<SearchResult[]> {
    await this.ready;
    if (!this.worker) {
      return [];
    }

    const { signal, limit, sources } = options;
    if (signal?.aborted) {
      throw createAbortError();
    }

    const requestId = this.nextRequestId();
    const message: SearchIndexRequest = {
      kind: 'query',
      requestId,
      query,
      limit,
      sources,
    };

    return new Promise<SearchResult[]>((resolve, reject) => {
      const pending: PendingQuery = { resolve, reject, signal };
      const abortListener = () => {
        if (!this.worker) {
          return;
        }
        this.pending.delete(requestId);
        const cancelMessage: SearchIndexRequest = { kind: 'cancel', requestId };
        this.worker.postMessage(cancelMessage);
        reject(createAbortError());
      };

      if (signal) {
        pending.abortListener = abortListener;
        signal.addEventListener('abort', abortListener, { once: true });
      }

      this.pending.set(requestId, pending);
      this.worker.postMessage(message);
    });
  }

  update(source: SearchSource, records: SearchRecord[]): void {
    if (!this.worker || !records || records.length === 0) {
      return;
    }
    void this.ready.then(() => {
      if (!this.worker) return;
      const message: SearchIndexRequest = { kind: 'upsert', source, records };
      this.worker.postMessage(message);
    });
  }

  remove(ids: string[], source?: SearchSource): void {
    if (!this.worker || !ids || ids.length === 0) {
      return;
    }
    void this.ready.then(() => {
      if (!this.worker) return;
      const message: SearchIndexRequest = { kind: 'remove', ids, source };
      this.worker.postMessage(message);
    });
  }

  refreshOnIdle(
    source: SearchSource,
    loader: () => Promise<SearchRecord[] | undefined | null>,
  ): void {
    if (!this.worker || !isBrowser) {
      return;
    }
    void this.ready.then(() => {
      this.scheduleIdle(async () => {
        try {
          const records = await loader();
          if (!records || records.length === 0 || !this.worker) {
            return;
          }
          const message: SearchIndexRequest = { kind: 'upsert', source, records };
          this.worker.postMessage(message);
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Search index refresh failed', error);
          }
        }
      });
    });
  }

  dispose(): void {
    if (!this.worker) return;
    this.worker.terminate();
    this.worker = undefined;
    this.pending.clear();
  }

  private async bootstrap(): Promise<void> {
    if (!this.worker) {
      return;
    }
    for (const [source, records] of Object.entries(staticSnapshots) as [SearchSource, SearchRecord[]][]) {
      if (records.length === 0) continue;
      const message: SearchIndexRequest = { kind: 'hydrate', source, records };
      this.worker.postMessage(message);
    }
  }

  private handleMessage = (event: MessageEvent<SearchIndexResponse>): void => {
    const message = event.data;
    switch (message.kind) {
      case 'results':
        this.settlePending(message.requestId, message.results);
        break;
      case 'error':
        if (typeof message.requestId === 'number') {
          this.rejectPending(message.requestId, new Error(message.message));
        } else if (process.env.NODE_ENV !== 'production') {
          console.warn('Search index worker error', message.message);
        }
        break;
      default:
        break;
    }
  };

  private handleWorkerError = (event: ErrorEvent): void => {
    if (process.env.NODE_ENV !== 'production') {
      console.error('Search index worker crashed', event.error ?? event.message);
    }
    const error = toError(event.error ?? event.message ?? 'Search worker error');
    const pendingKeys = Array.from(this.pending.keys());
    for (const requestId of pendingKeys) {
      this.rejectPending(requestId, error);
    }
  };

  private settlePending(requestId: number, results: SearchResult[]): void {
    const pending = this.pending.get(requestId);
    if (!pending) {
      return;
    }
    this.pending.delete(requestId);
    if (pending.signal && pending.abortListener) {
      pending.signal.removeEventListener('abort', pending.abortListener);
    }
    pending.resolve(results);
  }

  private rejectPending(requestId: number, reason: unknown): void {
    const pending = this.pending.get(requestId);
    if (!pending) {
      return;
    }
    this.pending.delete(requestId);
    if (pending.signal && pending.abortListener) {
      pending.signal.removeEventListener('abort', pending.abortListener);
    }
    pending.reject(toError(reason));
  }

  private scheduleIdle(task: () => void | Promise<void>): void {
    const callback: IdleCallback = () => {
      try {
        const result = task();
        if (result instanceof Promise) {
          void result.catch((error) => {
            if (process.env.NODE_ENV !== 'production') {
              console.warn('Search index idle task failed', error);
            }
          });
        }
      } catch (error) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn('Search index idle task failed', error);
        }
      }
    };

    if (!isBrowser) {
      callback({ didTimeout: false, timeRemaining: () => 0 });
      return;
    }

    if (typeof window.requestIdleCallback === 'function') {
      window.requestIdleCallback(callback as any);
    } else {
      const start = typeof performance !== 'undefined' ? performance.now() : Date.now();
      window.setTimeout(() => {
        const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
        callback({
          didTimeout: false,
          timeRemaining: () => Math.max(0, 50 - (now - start)),
        });
      }, 32);
    }
  }

  private nextRequestId(): number {
    this.requestId += 1;
    if (this.requestId > Number.MAX_SAFE_INTEGER) {
      this.requestId = 1;
    }
    return this.requestId;
  }
}

let clientInstance: SearchIndexClient | undefined;

function getClient(): SearchIndexClient | undefined {
  if (!isBrowser) {
    return undefined;
  }
  if (!clientInstance) {
    clientInstance = new SearchIndexClient();
  }
  return clientInstance;
}

export async function querySearchIndex(
  query: string,
  options: SearchQueryOptions = {},
): Promise<SearchResult[]> {
  const client = getClient();
  if (!client) {
    return [];
  }
  return client.query(query, options);
}

export function updateSearchIndex(source: SearchSource, records: SearchRecord[]): void {
  const client = getClient();
  client?.update(source, records);
}

export function removeFromSearchIndex(ids: string[], source?: SearchSource): void {
  const client = getClient();
  client?.remove(ids, source);
}

export function refreshSearchIndexOnIdle(
  source: SearchSource,
  loader: () => Promise<SearchRecord[] | undefined | null>,
): void {
  const client = getClient();
  client?.refreshOnIdle(source, loader);
}

export function isSearchIndexReady(): boolean {
  return Boolean(getClient());
}

export type { SearchRecord, SearchResult, SearchSource };
