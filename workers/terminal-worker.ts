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
  exitCode: number;
}

export type TerminalWorkerResponse = DataResponse | EndResponse;

type Stream = AsyncGenerator<string>;

interface Context {
  files: Record<string, string>;
}

interface CommandResult {
  stream: Stream;
  exitCode: number;
}

type CommandHandler = (
  args: string[],
  input: Stream,
  ctx: Context,
) => CommandResult | Promise<CommandResult>;

async function* emptyStream(): Stream {}

function textToStream(text: string): Stream {
  return chunkString(text);
}

async function* chunkString(text: string, size = CHUNK_SIZE): Stream {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

const handlers: Record<string, CommandHandler> = {
  echo: (args) => ({
    stream: textToStream(args.join(' ') + '\n'),
    exitCode: 0,
  }),
  upper: (_args, input) => ({
    stream: (async function* () {
      for await (const chunk of input) {
        yield chunk.toUpperCase();
      }
    })(),
    exitCode: 0,
  }),
  cat: (args, input, ctx) => {
    if (args[0]) {
      const content = ctx.files[args[0]];
      if (typeof content === 'string') {
        return { stream: textToStream(content), exitCode: 0 };
      }
      return {
        stream: textToStream(`cat: ${args[0]}: No such file or directory\n`),
        exitCode: 1,
      };
    }
    return { stream: input, exitCode: 0 };
  },
  grep: (args, input, ctx) => {
    const [pattern, file] = args;
    if (!pattern) {
      return {
        stream: textToStream('grep: missing search pattern\n'),
        exitCode: 2,
      };
    }
    let source: Stream = input;
    if (file) {
      const content = ctx.files[file];
      if (typeof content !== 'string') {
        return {
          stream: textToStream(`grep: ${file}: No such file or directory\n`),
          exitCode: 1,
        };
      }
      source = textToStream(content);
    }
    let regex: RegExp;
    try {
      regex = new RegExp(pattern);
    } catch (error: any) {
      return {
        stream: textToStream(`grep: invalid regex: ${error?.message ?? 'unknown error'}\n`),
        exitCode: 2,
      };
    }
    return {
      stream: (async function* () {
        for await (const chunk of source) {
          for (const line of chunk.split('\n')) {
            if (regex.test(line)) yield `${line}\n`;
          }
        }
      })(),
      exitCode: 0,
    };
  },
  jq: async (args, input, ctx) => {
    const [query, file] = args;
    let jsonText = '';
    if (file) {
      const content = ctx.files[file];
      if (typeof content !== 'string') {
        return {
          stream: textToStream(`jq: ${file}: No such file or directory\n`),
          exitCode: 1,
        };
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
          result = result?.[key];
        }
      }
      return {
        stream: textToStream(`${JSON.stringify(result, null, 2)}\n`),
        exitCode: 0,
      };
    } catch (error: any) {
      return {
        stream: textToStream(`jq: error: ${error?.message ?? 'invalid JSON'}\n`),
        exitCode: 4,
      };
    }
  },
  linecount: async (_args, input) => {
    let count = 0;
    for await (const chunk of input) {
      for (let i = 0; i < chunk.length; i += 1) {
        if (chunk[i] === '\n') count += 1;
      }
    }
    return {
      stream: textToStream(`${count}\n`),
      exitCode: 0,
    };
  },
};

async function buildPipeline(command: string, ctx: Context): Promise<CommandResult> {
  const segments = command
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return { stream: emptyStream(), exitCode: 0 };
  }

  let stream: Stream = emptyStream();
  let exitCode = 0;

  for (const seg of segments) {
    const [name, ...args] = seg.split(/\s+/);
    const handler = handlers[name];
    if (!handler) {
      stream = textToStream(`command not found: ${name}\n`);
      exitCode = 127;
      break;
    }
    const result = await handler(args, stream, ctx);
    stream = result.stream;
    exitCode = result.exitCode;
    if (exitCode !== 0) {
      break;
    }
  }

  return { stream, exitCode };
}

self.onmessage = async ({ data }: MessageEvent<TerminalWorkerRequest>) => {
  if (data.action === 'run') {
    const ctx: Context = { files: data.files || {} };
    const { stream, exitCode } = await buildPipeline(data.command, ctx);
    for await (const chunk of stream) {
      if (chunk) {
        (self as any).postMessage({ type: 'data', chunk } as DataResponse);
      }
    }
    (self as any).postMessage({ type: 'end', exitCode } as EndResponse);
  }
};

export {};
