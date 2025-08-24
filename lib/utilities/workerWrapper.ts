export interface WorkerLike {
  postMessage(msg: any): void;
  addEventListener(type: 'message' | 'error', listener: (ev: any) => void): void;
  removeEventListener(type: 'message' | 'error', listener: (ev: any) => void): void;
}

/**
 * Wrap a Worker-like object to return a promise-based call helper.
 */
export function wrapWorker<T, R>(worker: WorkerLike) {
  return (msg: T) =>
    new Promise<R>((resolve, reject) => {
      const onMessage = (e: any) => {
        cleanup();
        resolve(e.data as R);
      };
      const onError = (e: any) => {
        cleanup();
        reject(e.error ?? e);
      };
      const cleanup = () => {
        worker.removeEventListener('message', onMessage);
        worker.removeEventListener('error', onError);
      };
      worker.addEventListener('message', onMessage);
      worker.addEventListener('error', onError);
      worker.postMessage(msg);
    });
}
