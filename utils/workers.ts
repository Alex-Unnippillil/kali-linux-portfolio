const CONNECT_MESSAGE = '__connect__';
const DISCONNECT_MESSAGE = '__disconnect__';
const RELEASE_MESSAGE = '__release__';

type WorkerFactory = () => Worker;

type AcquireOptions = {
  scope?: string;
};

export interface WorkerClient<TRequest> {
  postMessage(message: TRequest, transferables?: Transferable[]): void;
  release(): void;
}

interface WorkerPool {
  worker: Worker;
  refs: number;
}

export interface WorkerManager<TRequest, TResponse> {
  acquire(
    onMessage: (event: MessageEvent<TResponse>) => void,
    options?: AcquireOptions,
  ): WorkerClient<TRequest>;
}

const hasWorkerSupport = () => {
  if (typeof globalThis === 'undefined') {
    return false;
  }
  const scope = globalThis as typeof globalThis & {
    Worker?: typeof Worker;
    MessageChannel?: typeof MessageChannel;
  };
  return (
    typeof scope.Worker !== 'undefined' &&
    typeof scope.MessageChannel !== 'undefined'
  );
};

export function createWorkerManager<TRequest, TResponse>({
  name,
  create,
}: {
  name: string;
  create: WorkerFactory;
}): WorkerManager<TRequest, TResponse> {
  const pools = new Map<string, WorkerPool>();

  const log = (...args: unknown[]) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info('[workers]', ...args);
    }
  };

  const ensurePool = (scopeKey: string): WorkerPool => {
    let pool = pools.get(scopeKey);
    if (!pool) {
      const worker = create();
      pool = { worker, refs: 0 };
      pools.set(scopeKey, pool);
      log(`${name}(${scopeKey}) spawned`);
    }
    return pool;
  };

  return {
    acquire(onMessage, options = {}) {
      if (!hasWorkerSupport()) {
        return {
          postMessage: () => {},
          release: () => {},
        };
      }

      const scope = options.scope ?? 'default';
      const poolKey = `${name}:${scope}`;
      const pool = ensurePool(poolKey);
      pool.refs += 1;

      const channel = new MessageChannel();
      const port = channel.port1;
      let released = false;

      const listener = (event: MessageEvent) => {
        onMessage(event as MessageEvent<TResponse>);
      };

      port.addEventListener('message', listener);
      port.start();

      pool.worker.postMessage(
        { type: CONNECT_MESSAGE, scope },
        [channel.port2],
      );

      log(`${name}(${scope}) ref count: ${pool.refs}`);

      return {
        postMessage(message, transferables) {
          if (released) return;
          const payload = message as unknown as any;
          if (transferables && transferables.length > 0) {
            port.postMessage(payload, transferables);
          } else {
            port.postMessage(payload);
          }
        },
        release() {
          if (released) return;
          released = true;
          try {
            port.postMessage({ type: RELEASE_MESSAGE } as unknown as TRequest);
          } catch (err) {
            log(`${name}(${scope}) release message failed`, err);
          }
          port.removeEventListener('message', listener);
          port.close();
          pool.refs -= 1;
          if (pool.refs <= 0) {
            try {
              pool.worker.postMessage({ type: DISCONNECT_MESSAGE, scope });
            } catch (err) {
              log(`${name}(${scope}) disconnect message failed`, err);
            }
            pool.worker.terminate();
            pools.delete(poolKey);
            log(`${name}(${scope}) terminated`);
          } else {
            log(`${name}(${scope}) release; refs remaining: ${pool.refs}`);
          }
        },
      };
    },
  };
}

export const workerSignals = {
  CONNECT_MESSAGE,
  DISCONNECT_MESSAGE,
  RELEASE_MESSAGE,
} as const;
