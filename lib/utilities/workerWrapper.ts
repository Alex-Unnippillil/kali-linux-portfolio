export interface WorkerLike {
  postMessage(msg: any): void;
  addEventListener(type: 'message' | 'error', listener: (ev: any) => void): void;
  removeEventListener(type: 'message' | 'error', listener: (ev: any) => void): void;
}

export interface WorkerCallOptions<P = any> {
  signal?: AbortSignal;
  onProgress?: (progress: P) => void;
}

/**
 * Wrap a Worker-like object to return a promise-based call helper with support
 * for progress events and cancellation via AbortController.
 */
export function wrapWorker<T, R, P = any>(
  worker: WorkerLike,
) {
  return (msg: T, opts: WorkerCallOptions<P> = {}) =>
    new Promise<R>((resolve, reject) => {
      const { signal, onProgress } = opts;
      let settled = false;

      const onMessage = (e: any) => {
        const data = e.data;
        if (data && typeof data === 'object' && 'progress' in data) {
          onProgress?.((data as any).progress as P);
          return;
        }
        settled = true;
        cleanup();
        resolve(data as R);
      };

      const onError = (e: any) => {
        settled = true;
        cleanup();
        reject(e.error ?? e);
      };

      const onAbort = () => {
        if (settled) return;
        settled = true;
        cleanup();
        try {
          worker.postMessage({ type: 'cancel' });
        } catch {
          // ignore
        }
        reject(new Error('aborted'));
      };

      const cleanup = () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
        signal?.removeEventListener('abort', onAbort);
      };

      if (signal?.aborted) {
        onAbort();
        return;
      }

      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      signal?.addEventListener('abort', onAbort);
      worker.postMessage(msg);
    });
}
