const CHUNK_SIZE = 64 * 1024; // 64KB
const MAX_DATA_SIZE = 1024 * 1024; // 1MB cap

export interface RunMessage {
  action: 'run';
  command: string;
  files?: Record<string, string>;
  id?: number;
}

export type PipelineWorkerRequest = RunMessage;

export interface DataResponse {
  type: 'data';
  chunk: string;
  id?: number;
}

export interface EndResponse {
  type: 'end';
  id?: number;
}

export type PipelineWorkerResponse = DataResponse | EndResponse;

type Stream = AsyncGenerator<string>;

interface Context {
  files: Record<string, string>;
}

async function* emptyStream(): Stream {}

function textToStream(text: string): Stream {
  return chunkString(text);
}

async function* chunkString(text: string, size = CHUNK_SIZE): Stream {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

async function streamToString(
  stream: Stream,
  limit = MAX_DATA_SIZE,
): Promise<string | null> {
  let out = '';
  for await (const chunk of stream) {
    out += chunk;
    if (out.length > limit) return null;
  }
  return out;
}

type CommandHandler = (args: string[], input: Stream, ctx: Context) => Stream;

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

const handlers: Record<string, CommandHandler> = {
  cat: (args, input, ctx) => {
    if (args[0]) {
      const content = ctx.files[args[0]];
      if (typeof content === 'string') {
        return textToStream(content);
      }
      return textToStream(`cat: ${args[0]}: No such file\n`);
    }
    return input;
  },
  grep: (args, input, ctx) => {
    const { pattern, file, flags } = parseGrepArgs(args);
    const regex = new RegExp(pattern, flags.caseInsensitive ? 'i' : '');
    const source = file ? ctx.files[file] : null;
    const stream = file
      ? source
        ? textToStream(source)
        : textToStream(`grep: ${file}: No such file or directory\n`)
      : input;
    return (async function* () {
      let buffer = '';
      let lineNumber = 0;
      for await (const chunk of stream) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          lineNumber += 1;
          if (regex.test(line)) {
            const prefix = flags.lineNumbers ? `${lineNumber}:` : '';
            yield prefix + line + '\n';
          }
        }
      }
      if (buffer) {
        lineNumber += 1;
        if (regex.test(buffer)) {
          const prefix = flags.lineNumbers ? `${lineNumber}:` : '';
          yield prefix + buffer + '\n';
        }
      }
    })();
  },
  jq: (args, input, ctx) =>
    (async function* () {
      const query = args[0] ?? '.';
      const file = args[1];
      const source = file ? ctx.files[file] : await streamToString(input);
      if (file && typeof ctx.files[file] !== 'string') {
        yield `jq: ${file}: No such file or directory\n`;
        return;
      }
      if (source === null) {
        yield 'jq: data limit exceeded\n';
        return;
      }
      try {
        const parsed = JSON.parse(source);
        const result = runJqQuery(parsed, query);
        yield JSON.stringify(result, null, 2) + '\n';
      } catch {
        yield 'jq: invalid JSON input\n';
      }
    })(),
  sort: (args, input) =>
    (async function* () {
      const text = await streamToString(input);
      if (text === null) {
        yield `sort: data limit exceeded\n`;
        return;
      }
      const lines = text.split('\n').filter((l) => l.length > 0);
      lines.sort();
      yield* chunkString(lines.join('\n') + '\n');
    })(),
  uniq: (args, input) =>
    (async function* () {
      const text = await streamToString(input);
      if (text === null) {
        yield `uniq: data limit exceeded\n`;
        return;
      }
      const lines = text.split('\n');
      const result: string[] = [];
      let prev: string | undefined;
      for (const line of lines) {
        if (line !== prev) result.push(line);
        prev = line;
      }
      yield* chunkString(result.join('\n') + '\n');
    })(),
};

function buildPipeline(command: string, ctx: Context): Stream {
  const segments = command
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  let stream: Stream = emptyStream();
  for (const seg of segments) {
    const [name, ...args] = seg.split(/\s+/);
    const handler = handlers[name];
    if (handler) {
      stream = handler(args, stream, ctx);
    } else {
      stream = textToStream(`command not found: ${name}\n`);
      break;
    }
  }
  return stream;
}

self.onmessage = async ({ data }: MessageEvent<PipelineWorkerRequest>) => {
  if (data.action === 'run') {
    const ctx: Context = { files: data.files || {} };
    const stream = buildPipeline(data.command, ctx);
    for await (const chunk of stream) {
      (self as any).postMessage({ type: 'data', chunk, id: data.id } as DataResponse);
    }
    (self as any).postMessage({ type: 'end', id: data.id } as EndResponse);
  }
};

export {};
