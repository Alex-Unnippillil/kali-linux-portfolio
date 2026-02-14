import { WorkerPool, type WorkerPoolTask, TASK_CANCELLED } from './workerPool';
import type {
  SimulatorParserRequest,
  SimulatorParserResponse,
  ParsedLine,
} from '../../workers/simulatorParser.worker';

type FixturesParseMessage =
  | { type: 'parse'; text: string }
  | { type: 'cancel' };

type FixturesWorkerResponse =
  | { type: 'progress'; payload: number }
  | { type: 'result'; payload: any[] }
  | { type: 'cancelled' };

interface SimulatorProgressPayload {
  progress: number;
  eta: number;
}

export interface FixtureParseOptions {
  onProgress?: (progress: number) => void;
}

export interface SimulatorParseOptions {
  onProgress?: (payload: SimulatorProgressPayload) => void;
}

const createFixturesWorker = () =>
  new Worker(new URL('../../workers/fixturesParser.ts', import.meta.url));

const createSimulatorWorker = () =>
  new Worker(new URL('../../workers/simulatorParser.worker.ts', import.meta.url));

const fixturesPool = new WorkerPool<FixturesParseMessage, any[]>({
  size: 2,
  createWorker: createFixturesWorker,
});

const simulatorPool = new WorkerPool<SimulatorParserRequest, ParsedLine[]>({
  size: 2,
  createWorker: createSimulatorWorker,
});

const isFixturesProgress = (data: unknown): data is { type: 'progress'; payload: number } =>
  typeof data === 'object' && data !== null && (data as FixturesWorkerResponse).type === 'progress';

const isFixturesResult = (data: unknown): data is { type: 'result'; payload: any[] } =>
  typeof data === 'object' && data !== null && (data as FixturesWorkerResponse).type === 'result';

const isFixturesCancelled = (data: unknown): data is { type: 'cancelled' } =>
  typeof data === 'object' && data !== null && (data as FixturesWorkerResponse).type === 'cancelled';

const parseFixturesFallback = (
  text: string,
  onProgress?: (progress: number) => void,
) => {
  const lines = text.split(/\n/);
  const total = lines.length || 1;
  const result: any[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      result.push(JSON.parse(line));
    } catch {
      result.push({ line });
    }
    if (i % 100 === 0) {
      onProgress?.(Math.round(((i + 1) / total) * 100));
    }
  }
  onProgress?.(100);
  return result;
};

const parseSimulatorFallback = (
  text: string,
  onProgress?: (payload: SimulatorProgressPayload) => void,
): ParsedLine[] => {
  const lines = text.split(/\r?\n/);
  const total = lines.length || 1;
  const start = Date.now();
  const parsed: ParsedLine[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const [key, ...rest] = line.split(':');
    parsed.push({
      line: i + 1,
      key: key.trim(),
      value: rest.join(':').trim(),
      raw: line,
    });
    if (i % 100 === 0) {
      const progress = (i + 1) / total;
      const elapsed = Date.now() - start;
      const eta = progress > 0 ? (elapsed * (1 - progress)) / progress : 0;
      onProgress?.({ progress, eta });
    }
  }
  onProgress?.({ progress: 1, eta: 0 });
  return parsed;
};

export const parseFixtures = (
  text: string,
  options: FixtureParseOptions = {},
): WorkerPoolTask<any[]> =>
  fixturesPool.runTask(
    { type: 'parse', text },
    {
      onMessage: (data) => {
        if (isFixturesProgress(data)) {
          options.onProgress?.(data.payload);
        }
      },
      resolve: (data) => {
        if (isFixturesResult(data)) return data.payload;
        if (isFixturesCancelled(data)) return TASK_CANCELLED;
        return undefined;
      },
      onCancel: (worker) => {
        try {
          worker.postMessage({ type: 'cancel' });
        } catch {
          /* ignore */
        }
      },
      fallback: () => parseFixturesFallback(text, options.onProgress),
    },
  );

const isSimulatorProgress = (
  data: SimulatorParserResponse,
): data is Extract<SimulatorParserResponse, { type: 'progress' }> =>
  data?.type === 'progress';

export const parseSimulator = (
  text: string,
  options: SimulatorParseOptions = {},
): WorkerPoolTask<ParsedLine[]> =>
  simulatorPool.runTask(
    { action: 'parse', text },
    {
      onMessage: (data) => {
        const response = data as SimulatorParserResponse;
        if (isSimulatorProgress(response)) {
          options.onProgress?.({
            progress: response.progress,
            eta: response.eta,
          });
        }
      },
      resolve: (data) => {
        const response = data as SimulatorParserResponse;
        if (response?.type === 'done') return response.parsed;
        if (response?.type === 'cancelled') return TASK_CANCELLED;
        return undefined;
      },
      onCancel: (worker) => {
        try {
          worker.postMessage({ action: 'cancel' } satisfies SimulatorParserRequest);
        } catch {
          /* ignore */
        }
      },
      fallback: () => parseSimulatorFallback(text, options.onProgress),
    },
  );

