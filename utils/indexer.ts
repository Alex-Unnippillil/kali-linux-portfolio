import {
  IndexerCompleteDetail,
  IndexerEngine,
  IndexerEngineOptions,
  IndexerJobStatus,
  IndexerMetadata,
  IndexerProgressDetail,
  IndexerSearchHit,
  IndexerWorkerEvent,
} from './indexer-core';

type DirectoryIndexerEvent =
  | { type: 'progress'; detail: IndexerProgressDetail }
  | { type: 'complete'; detail: IndexerCompleteDetail }
  | { type: 'paused' }
  | { type: 'resumed' }
  | { type: 'cancelled' }
  | { type: 'index-update'; metadata: IndexerMetadata }
  | { type: 'error'; message: string };

export interface IndexerSnapshot {
  status: IndexerJobStatus;
  filesProcessed: number;
  bytesProcessed: number;
  pending: number;
  elapsedMs: number;
  currentPath?: string;
  lastError?: string;
  lastComplete?: IndexerCompleteDetail;
}

export interface DirectoryIndexer {
  start(directoryHandle: FileSystemDirectoryHandle, options?: IndexerEngineOptions): void;
  pause(): void;
  resume(): void;
  cancel(): void;
  updateFile(path: string, handle: FileSystemFileHandle): Promise<void>;
  search(query: string, options?: { limit?: number }): Promise<IndexerSearchHit[]>;
  subscribe(listener: (event: DirectoryIndexerEvent) => void): () => void;
  getSnapshot(): IndexerSnapshot;
  destroy(): void;
}

interface DirectoryIndexerOptions {
  useWorker?: boolean;
  workerFactory?: () => Worker;
  engineOptions?: IndexerEngineOptions;
}

interface PendingSearch {
  resolve: (hits: IndexerSearchHit[]) => void;
  reject: (error: Error) => void;
  timeout: ReturnType<typeof setTimeout>;
}

const DEFAULT_SEARCH_TIMEOUT = 1000 * 60; // 60 seconds safeguard

let globalJobId = 0;
let globalSearchId = 0;

function createWorkerFactory() {
  return () => new Worker(new URL('../workers/indexer.worker.ts', import.meta.url));
}

export function createDirectoryIndexer(options?: DirectoryIndexerOptions): DirectoryIndexer {
  const listeners = new Set<(event: DirectoryIndexerEvent) => void>();
  const snapshot: IndexerSnapshot = {
    status: 'idle',
    filesProcessed: 0,
    bytesProcessed: 0,
    pending: 0,
    elapsedMs: 0,
  };

  const usingWorker =
    options?.useWorker ?? (typeof window !== 'undefined' && typeof Worker !== 'undefined');

  const workerFactory = options?.workerFactory ?? createWorkerFactory();
  const engineOptions = options?.engineOptions;
  const pendingSearches = new Map<number, PendingSearch>();

  let worker: Worker | null = null;
  let engine: IndexerEngine | null = null;
  let currentJobId = 0;

  function emit(event: DirectoryIndexerEvent) {
    for (const listener of listeners) {
      listener(event);
    }
  }

  function updateSnapshot(partial: Partial<IndexerSnapshot>) {
    Object.assign(snapshot, partial);
  }

  function ensureWorker() {
    if (!worker) {
      worker = workerFactory();
      worker.onmessage = (event: MessageEvent<IndexerWorkerEvent>) => {
        handleWorkerEvent(event.data);
      };
    }
  }

  function ensureEngine() {
    if (!engine) {
      engine = new IndexerEngine((event) => handleWorkerEvent(event), engineOptions);
    }
  }

  function handleWorkerEvent(event: IndexerWorkerEvent) {
    if (!event) return;
    switch (event.type) {
      case 'progress':
        if (event.detail.jobId !== currentJobId) return;
        updateSnapshot({
          status: 'indexing',
          filesProcessed: event.detail.filesProcessed,
          bytesProcessed: event.detail.bytesProcessed,
          pending: event.detail.pending,
          elapsedMs: event.detail.elapsedMs,
          currentPath: event.detail.currentPath,
        });
        emit({ type: 'progress', detail: event.detail });
        break;
      case 'complete':
        if (event.detail.jobId !== currentJobId) return;
        updateSnapshot({
          status: 'completed',
          filesProcessed: event.detail.filesIndexed,
          bytesProcessed: event.detail.bytesIndexed,
          pending: 0,
          elapsedMs: event.detail.durationMs,
          lastComplete: event.detail,
        });
        emit({ type: 'complete', detail: event.detail });
        break;
      case 'paused':
        if (event.jobId !== currentJobId) return;
        updateSnapshot({ status: 'paused' });
        emit({ type: 'paused' });
        break;
      case 'resumed':
        if (event.jobId !== currentJobId) return;
        updateSnapshot({ status: 'indexing' });
        emit({ type: 'resumed' });
        break;
      case 'cancelled':
        if (event.jobId !== currentJobId) return;
        updateSnapshot({ status: 'cancelled', pending: 0 });
        emit({ type: 'cancelled' });
        break;
      case 'index-update':
        if (event.jobId !== currentJobId) return;
        emit({ type: 'index-update', metadata: event.metadata });
        break;
      case 'error':
        if (event.jobId !== currentJobId) return;
        updateSnapshot({ status: 'error', lastError: event.message });
        emit({ type: 'error', message: event.message });
        break;
      case 'search-result': {
        if (event.jobId !== currentJobId) return;
        const requestId = event.requestId;
        if (typeof requestId === 'number') {
          const pending = pendingSearches.get(requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            pending.resolve(event.hits);
            pendingSearches.delete(requestId);
          }
        }
        break;
      }
      default:
        break;
    }
  }

  function start(directoryHandle: FileSystemDirectoryHandle, startOptions?: IndexerEngineOptions) {
    if (!directoryHandle) return;
    currentJobId = ++globalJobId;
    updateSnapshot({
      status: 'indexing',
      filesProcessed: 0,
      bytesProcessed: 0,
      pending: 0,
      elapsedMs: 0,
      currentPath: undefined,
      lastError: undefined,
      lastComplete: undefined,
    });
    if (usingWorker) {
      ensureWorker();
      worker?.postMessage({
        type: 'start',
        jobId: currentJobId,
        directoryHandle,
        options: { ...engineOptions, ...startOptions },
      });
    } else {
      ensureEngine();
      engine?.start(directoryHandle, currentJobId, { ...engineOptions, ...startOptions });
    }
  }

  function pause() {
    if (!currentJobId) return;
    if (usingWorker) {
      worker?.postMessage({ type: 'pause', jobId: currentJobId });
    } else {
      engine?.pause(currentJobId);
    }
  }

  function resume() {
    if (!currentJobId) return;
    if (usingWorker) {
      worker?.postMessage({ type: 'resume', jobId: currentJobId });
    } else {
      engine?.resume(currentJobId);
    }
  }

  function cancel() {
    if (!currentJobId) return;
    if (usingWorker) {
      worker?.postMessage({ type: 'cancel', jobId: currentJobId });
    } else {
      engine?.cancel(currentJobId);
    }
  }

  async function updateFile(path: string, handle: FileSystemFileHandle) {
    if (!currentJobId || !path || !handle) return;
    if (usingWorker) {
      worker?.postMessage({ type: 'update-file', jobId: currentJobId, path, handle });
    } else {
      await engine?.updateFile(path, handle);
    }
  }

  function search(query: string, options?: { limit?: number }) {
    const limit = options?.limit ?? 50;
    const requestId = ++globalSearchId;
    return new Promise<IndexerSearchHit[]>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingSearches.delete(requestId);
        reject(new Error('Search timed out'));
      }, DEFAULT_SEARCH_TIMEOUT);
      pendingSearches.set(requestId, { resolve, reject, timeout });
      if (usingWorker) {
        ensureWorker();
        worker?.postMessage({
          type: 'search',
          jobId: currentJobId,
          query,
          limit,
          requestId,
        });
      } else {
        ensureEngine();
        void engine?.search(currentJobId, query, limit, requestId).catch((error) => {
          const pending = pendingSearches.get(requestId);
          if (pending) {
            clearTimeout(pending.timeout);
            pending.reject(error instanceof Error ? error : new Error('Search failed'));
            pendingSearches.delete(requestId);
          }
        });
      }
    });
  }

  function subscribe(listener: (event: DirectoryIndexerEvent) => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function getSnapshot() {
    return { ...snapshot };
  }

  function destroy() {
    cancel();
    if (worker) {
      worker.terminate();
      worker = null;
    }
    if (engine) {
      // No explicit teardown required for inline engine
      engine = null;
    }
    for (const pending of pendingSearches.values()) {
      clearTimeout(pending.timeout);
      pending.reject(new Error('Indexer destroyed'));
    }
    pendingSearches.clear();
    listeners.clear();
  }

  return {
    start,
    pause,
    resume,
    cancel,
    updateFile,
    search,
    subscribe,
    getSnapshot,
    destroy,
  };
}

export type { IndexerMetadata, IndexerSearchHit } from './indexer-core';

