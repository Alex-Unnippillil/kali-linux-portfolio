import type {
  PipelineWorkerRequest,
  PipelineWorkerResponse,
} from '../workers/pipelineWorker';

type RunnerOptions = {
  files?: Record<string, string>;
  timeoutMs?: number;
};

type PendingRequest = {
  resolve: (value: string) => void;
  reject: (reason?: unknown) => void;
  chunks: string[];
  timeout: ReturnType<typeof setTimeout> | null;
};

const DEFAULT_TIMEOUT = 6000;

const runSyncPipeline = (command: string, files: Record<string, string>) => {
  const segments = command
    .split('|')
    .map((segment) => segment.trim())
    .filter(Boolean);
  let output = '';
  let input = '';
  segments.forEach((segment) => {
    const [name, ...args] = segment.split(/\s+/);
    if (name === 'cat') {
      const path = args[0];
      input = typeof files[path] === 'string' ? files[path] : `cat: ${path}: No such file\n`;
    } else if (name === 'grep') {
      const { pattern, file, flags } = parseGrepArgs(args);
      const source = file ? files[file] ?? '' : input;
      if (file && typeof files[file] !== 'string') {
        input = `grep: ${file}: No such file or directory\n`;
        return;
      }
      const regex = new RegExp(pattern, flags.caseInsensitive ? 'i' : '');
      const lines = source.split('\n');
      input = lines
        .map((line, idx) => ({ line, idx }))
        .filter(({ line }) => regex.test(line))
        .map(({ line, idx }) => (flags.lineNumbers ? `${idx + 1}:${line}` : line))
        .join('\n');
      if (input && !input.endsWith('\n')) input += '\n';
    } else if (name === 'jq') {
      const query = args[0] ?? '.';
      const file = args[1];
      const source = file ? files[file] ?? '' : input;
      if (file && typeof files[file] !== 'string') {
        input = `jq: ${file}: No such file or directory\n`;
        return;
      }
      try {
        const parsed = JSON.parse(source);
        const result = runJqQuery(parsed, query);
        input = JSON.stringify(result, null, 2) + '\n';
      } catch {
        input = 'jq: invalid JSON input\n';
      }
    } else if (name === 'sort') {
      const lines = input.split('\n').filter((line) => line.length > 0);
      lines.sort();
      input = lines.join('\n') + '\n';
    } else if (name === 'uniq') {
      const lines = input.split('\n');
      const result: string[] = [];
      let prev = '';
      lines.forEach((line) => {
        if (line !== prev) result.push(line);
        prev = line;
      });
      input = result.join('\n') + '\n';
    } else {
      input = `command not found: ${name}\n`;
    }
  });
  output = input;
  return output;
};

const parseGrepArgs = (args: string[]) => {
  const flags = { caseInsensitive: false, lineNumbers: false };
  const rest = [...args];
  while (rest[0] && rest[0].startsWith('-')) {
    const flag = rest.shift() ?? '';
    if (flag.includes('i')) flags.caseInsensitive = true;
    if (flag.includes('n')) flags.lineNumbers = true;
  }
  const pattern = rest.shift() ?? '';
  const file = rest.shift();
  return { pattern, file, flags };
};

const runJqQuery = (data: unknown, query: string) => {
  if (!query.startsWith('.')) return data;
  const path = query
    .replace(/^\./, '')
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean);
  let current: unknown = data;
  for (const segment of path) {
    if (current && typeof current === 'object' && segment in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[segment];
    } else {
      return null;
    }
  }
  return current;
};

export const createWorkerRunner = () => {
  let worker: Worker | null = null;
  let idCounter = 0;
  const pending = new Map<number, PendingRequest>();

  const ensureWorker = () => {
    if (worker) return worker;
    try {
      worker = new Worker(new URL('../workers/pipelineWorker.ts', import.meta.url));
      worker.onmessage = (event: MessageEvent<PipelineWorkerResponse & { id?: number }>) => {
        const { id } = event.data as { id?: number };
        if (typeof id !== 'number') return;
        const entry = pending.get(id);
        if (!entry) return;
        if (event.data.type === 'data') {
          entry.chunks.push(event.data.chunk);
          return;
        }
        if (event.data.type === 'end') {
          if (entry.timeout) clearTimeout(entry.timeout);
          pending.delete(id);
          entry.resolve(entry.chunks.join(''));
        }
      };
      worker.onerror = (error) => {
        pending.forEach((entry) => entry.reject(error));
        pending.clear();
      };
    } catch {
      worker = null;
    }
    return worker;
  };

  const run = async (command: string, options: RunnerOptions = {}) => {
    const files = options.files ?? {};
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT;
    const instance = ensureWorker();
    if (!instance) {
      return runSyncPipeline(command, files);
    }
    const id = idCounter += 1;
    const request: PipelineWorkerRequest & { id: number } = {
      action: 'run',
      command,
      files,
      id,
    };
    return new Promise<string>((resolve, reject) => {
      const timeout = setTimeout(() => {
        pending.delete(id);
        reject(new Error('Pipeline worker timeout'));
      }, timeoutMs);
      pending.set(id, { resolve, reject, chunks: [], timeout });
      instance.postMessage(request);
    }).catch(() => runSyncPipeline(command, files));
  };

  const dispose = () => {
    if (worker) {
      worker.terminate();
      worker = null;
    }
    pending.clear();
  };

  return { run, dispose };
};
