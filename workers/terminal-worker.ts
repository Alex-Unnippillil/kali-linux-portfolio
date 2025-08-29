const CHUNK_SIZE = 64 * 1024; // 64KB

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
  linecount: async function* (args, input) {
    let count = 0;
    for await (const chunk of input) {
      for (let i = 0; i < chunk.length; i++) {
        if (chunk[i] === '\n') count += 1;
      }
    }
    yield String(count) + '\n';
  },
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
