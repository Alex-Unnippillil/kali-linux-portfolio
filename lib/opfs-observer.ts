export type OPFSObserverCallback = (records: unknown[]) => void;

interface FileSystemObserverInstance {
  observe(target: unknown, options?: { recursive?: boolean }): Promise<void>;
  disconnect(): void;
}

interface FileSystemObserverConstructor {
  new (callback: FileSystemObserverCallback): FileSystemObserverInstance;
}

type FileSystemObserverCallback = (
  records: unknown[],
  observer: FileSystemObserverInstance,
) => void;

declare global {
  // eslint-disable-next-line no-var
  var FileSystemObserver: FileSystemObserverConstructor | undefined;
}

/**
 * Observe the Origin Private File System (OPFS) for changes.
 * Returns a cleanup function that disconnects the observer.
 */
export function observeOPFS(callback: OPFSObserverCallback): () => void {
  const globalScope = typeof globalThis !== 'undefined' ? (globalThis as any) : undefined;
  const ObserverCtor = globalScope?.FileSystemObserver as
    | FileSystemObserverConstructor
    | undefined;

  if (
    typeof ObserverCtor !== 'function' ||
    typeof navigator === 'undefined' ||
    !navigator.storage?.getDirectory
  ) {
    return () => {};
  }

  let stopped = false;
  let observer: FileSystemObserverInstance | null = null;

  const startObservation = async () => {
    try {
      const root = await navigator.storage.getDirectory();
      if (!root || stopped) return;

      observer = new ObserverCtor((records) => {
        if (stopped) return;
        try {
          callback(records);
        } catch (error) {
          if (process.env.NODE_ENV !== 'production') {
            console.warn('Error in OPFS observer callback', error);
          }
        }
      });

      await observer.observe(root, { recursive: true });
    } catch (error) {
      if (process.env.NODE_ENV !== 'production') {
        console.warn('Failed to start OPFS observer', error);
      }
    }
  };

  void startObservation();

  return () => {
    stopped = true;
    try {
      observer?.disconnect();
    } catch {
      // ignore disconnect errors
    }
    observer = null;
  };
}
