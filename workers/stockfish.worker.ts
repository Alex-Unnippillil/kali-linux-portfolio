type StockfishCommandMessage = { type: 'command'; command: string };
type StockfishAnalyzeMessage = {
  type: 'analyze';
  fen: string;
  depth: number;
  multiPv?: number;
};
type StockfishStopMessage = { type: 'stop' };
type StockfishQuitMessage = { type: 'quit' };

type StockfishStructuredMessage =
  | StockfishCommandMessage
  | StockfishAnalyzeMessage
  | StockfishStopMessage
  | StockfishQuitMessage;

export type StockfishWorkerRequest = StockfishStructuredMessage | string;
export type StockfishWorkerResponse = string;

type StockfishInstance = {
  postMessage: (command: string) => void;
  addMessageListener: (listener: (line: string) => void) => void;
};

type StockfishFactory = () => Promise<StockfishInstance>;

let enginePromise: Promise<StockfishInstance> | null = null;

const loadEngine = async (): Promise<StockfishInstance> => {
  if (!enginePromise) {
    enginePromise = import('stockfish')
      .then(async (module: unknown) => {
        const resolved = module as { default?: StockfishFactory };
        const factory: StockfishFactory =
          typeof resolved.default === 'function'
            ? resolved.default
            : (resolved as unknown as StockfishFactory);
        const instance = await factory();
        instance.addMessageListener((line: string) => {
          self.postMessage(line as StockfishWorkerResponse);
        });
        return instance;
      })
      .catch((error) => {
        enginePromise = null;
        throw error;
      });
  }
  return enginePromise;
};

const forwardCommand = async (command: string) => {
  if (!command) return;
  try {
    const engine = await loadEngine();
    engine.postMessage(command);
  } catch {
    // Ignore errors during initialization.
  }
};

self.onmessage = async ({ data }: MessageEvent<StockfishWorkerRequest>) => {
  if (typeof data === 'string') {
    await forwardCommand(data);
    return;
  }

  if (!data) return;

  if (data.type === 'quit') {
    const promise = enginePromise;
    enginePromise = null;
    if (promise) {
      try {
        const engine = await promise;
        engine.postMessage('quit');
      } catch {
        // Ignore errors while shutting down.
      }
    }
    self.close();
    return;
  }

  if (data.type === 'stop') {
    if (enginePromise) {
      try {
        const engine = await enginePromise;
        engine.postMessage('stop');
      } catch {
        // Ignore
      }
    }
    return;
  }

  if (data.type === 'command') {
    await forwardCommand(data.command);
    return;
  }

  if (data.type === 'analyze') {
    const { fen, depth, multiPv } = data;
    try {
      const engine = await loadEngine();
      const cappedDepth = Number.isFinite(depth) ? Math.max(1, Math.floor(depth)) : 12;
      const option = typeof multiPv === 'number' ? Math.max(1, Math.floor(multiPv)) : 3;
      engine.postMessage('stop');
      engine.postMessage(`setoption name MultiPV value ${option}`);
      engine.postMessage(`position fen ${fen}`);
      engine.postMessage(`go depth ${cappedDepth}`);
    } catch {
      // Ignore analysis errors
    }
  }
};

export {};
