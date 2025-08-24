import { LicenseMatchResult } from './licenseMatcher';

interface WorkerClientOptions {
  signal?: AbortSignal;
  onProgress?: (progress: number) => void;
}

export function matchLicenseWorker(
  text: string,
  options: WorkerClientOptions = {}
): Promise<LicenseMatchResult> {
  const { signal, onProgress } = options;
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./licenseMatcher.worker.ts', import.meta.url));
    const id = Math.random().toString(36).slice(2);

    const cleanup = () => {
      worker.terminate();
      signal?.removeEventListener('abort', onAbort);
    };

    worker.onmessage = (e: MessageEvent<any>) => {
      if (e.data.id !== id) return;
      if (typeof e.data.progress === 'number') {
        onProgress?.(e.data.progress);
        return;
      }
      cleanup();
      if (e.data.error) {
        if (e.data.error === 'aborted') {
          reject(new DOMException('Aborted', 'AbortError'));
        } else {
          reject(new Error(e.data.error));
        }
      } else {
        resolve(e.data.result as LicenseMatchResult);
      }
    };

    const onAbort = () => {
      worker.postMessage({ id, type: 'cancel' });
    };

    if (signal) {
      if (signal.aborted) {
        onAbort();
      } else {
        signal.addEventListener('abort', onAbort);
      }
    }

    worker.postMessage({ id, text });
  });
}
