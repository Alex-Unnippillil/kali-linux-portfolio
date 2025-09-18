import { releaseProxy, wrap, type Remote } from 'comlink';

type WorkerFactory = () => Worker;

interface WorkerHandle<T> {
  worker(): Remote<T> | null;
  terminate(): void;
}

export const createWorker = <T>(factory: WorkerFactory): WorkerHandle<T> => {
  let workerRef: Worker | null = null;
  let remoteRef: Remote<T> | null = null;

  const ensure = (): Remote<T> | null => {
    if (typeof window === 'undefined' || typeof Worker === 'undefined') {
      return null;
    }
    if (!workerRef) {
      workerRef = factory();
      remoteRef = wrap<T>(workerRef);
    }
    return remoteRef;
  };

  const terminate = () => {
    if (remoteRef) {
      try {
        remoteRef[releaseProxy]();
      } catch (error) {
        // no-op if the proxy was already released
      }
      remoteRef = null;
    }
    if (workerRef) {
      workerRef.terminate();
      workerRef = null;
    }
  };

  return {
    worker: ensure,
    terminate,
  };
};

export default createWorker;
