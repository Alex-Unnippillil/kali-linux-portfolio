const CHUNK_SIZE = 64 * 1024; // 64KB
const MAX_DATA_SIZE = 1024 * 1024; // 1MB cap

export interface RunMessage {
  action: 'run';
  command: string;
  files?: Record<string, string>;
}

export type TerminalWorkerRequest = RunMessage;

export interface DataResponse {
  type: 'data';
  chunk: string;
}

export interface EndResponse {
  type: 'end';
}

export type TerminalWorkerResponse = DataResponse | EndResponse;

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
  echo: (args) =>
    (async function* () {
      yield args.join(' ') + '\n';
    })(),
  upper: async function* (args, input) {
    for await (const chunk of input) {
      yield chunk.toUpperCase();
    }
  },
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
    const [pattern, file] = args;
    let source: Stream;
    if (file) {
      const content = ctx.files[file];
      if (typeof content !== 'string') {
        return textToStream(`grep: ${file}: No such file\n`);
      }
      source = textToStream(content);
    } else {
      source = input;
    }
    const regex = new RegExp(pattern);
    return (async function* () {
      for await (const chunk of source) {
        for (const line of chunk.split('\n')) {
          if (regex.test(line)) yield line + '\n';
        }
      }
    })();
  },
  jq: (args, input, ctx) => {
    const [query, file] = args;
    return (async function* () {
      let jsonText = '';
      if (file) {
        const content = ctx.files[file];
        if (typeof content !== 'string') {
          yield `jq: ${file}: No such file\n`;
          return;
        }
        jsonText = content;
      } else {
        for await (const chunk of input) {
          jsonText += chunk;
        }
      }
      try {
        let result: any = JSON.parse(jsonText);
        if (query) {
          for (const key of query.split('.').filter(Boolean)) {
            result = result[key];
          }
        }
        yield JSON.stringify(result, null, 2) + '\n';
      } catch (e: any) {
        yield `jq: error: ${e.message}\n`;
      }
    })();
  },
  linecount: async function* (args, input) {
    let count = 0;
    for await (const chunk of input) {
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === '\n') count += 1;
      }
    }
    yield String(count) + '\n';
  },
  hash: (args, input) =>
    (async function* () {
      let text = args.join(' ').trim();
      if (!text) {
        const piped = await streamToString(input);
        if (piped === null) {
          yield 'hash: input too large\n';
          return;
        }
        text = piped.trim();
      }
      if (!text) {
        yield 'hash: provide text or pipe data\n';
        return;
      }

      yield `[*] Starting hash simulation for "${text}"\n`;

      const encoder = new TextEncoder();
      const bytes = encoder.encode(text);
      const data = bytes.length > 0 ? bytes : new Uint8Array([0]);
      const iterations = Math.max(200_000, data.length * 120_000);
      const steps = 5;
      const chunkSize = Math.ceil(iterations / steps);
      let acc = 0;

      for (let step = 0; step < steps; step += 1) {
        const start = step * chunkSize;
        const end = Math.min(iterations, start + chunkSize);
        for (let i = start; i < end; i += 1) {
          const value = data[i % data.length];
          acc = (acc + (value + i) * 2654435761) >>> 0;
        }
        const progress = Math.round(((step + 1) / steps) * 100);
        yield `[*] Progress ${progress}%\n`;
      }

      const hash = acc.toString(16).padStart(8, '0');
      yield `[*] Fake hash result: ${hash}\n`;
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

self.onmessage = async ({ data }: MessageEvent<TerminalWorkerRequest>) => {
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
