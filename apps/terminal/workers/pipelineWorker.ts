const CHUNK_SIZE = 64 * 1024; // 64KB
const MAX_DATA_SIZE = 1024 * 1024; // 1MB cap

export interface RunMessage {
  action: 'run';
  command: string;
  files?: Record<string, string>;
}

export type PipelineWorkerRequest = RunMessage;

export interface DataResponse {
  type: 'data';
  chunk: string;
}

export interface EndResponse {
  type: 'end';
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
  grep: (args, input) => {
    const pattern = args[0] || '';
    const regex = new RegExp(pattern);
    return (async function* () {
      let buffer = '';
      for await (const chunk of input) {
        buffer += chunk;
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (regex.test(line)) yield line + '\n';
        }
      }
      if (buffer && regex.test(buffer)) yield buffer + '\n';
    })();
  },
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
    const [name = '', ...args] = seg.split(/\s+/);
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
      (self as any).postMessage({ type: 'data', chunk } as DataResponse);
    }
    (self as any).postMessage({ type: 'end' } as EndResponse);
  }
};

export {};
