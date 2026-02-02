const CHUNK_SIZE = 64 * 1024; // 64KB

export interface RunMessage {
  action: 'run';
  command: string;
  files?: Record<string, string>;
  opfsRoot?: FileSystemDirectoryHandle;
  cwd?: string;
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
  opfsRoot?: FileSystemDirectoryHandle;
  cwd: string;
}

async function* emptyStream(): Stream { }

function textToStream(text: string): Stream {
  return chunkString(text);
}

async function* chunkString(text: string, size = CHUNK_SIZE): Stream {
  for (let i = 0; i < text.length; i += size) {
    yield text.slice(i, i + size);
  }
}

// FS Utils (Inlined to avoid import issues in worker)
async function getFileHandle(root: FileSystemDirectoryHandle, path: string): Promise<FileSystemFileHandle | null> {
  const parts = path.split('/').filter(Boolean);
  let current: FileSystemDirectoryHandle = root;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    try {
      if (i === parts.length - 1) {
        return await current.getFileHandle(part);
      }
      current = await current.getDirectoryHandle(part);
    } catch {
      return null;
    }
  }
  return null;
}

async function readFile(root: FileSystemDirectoryHandle, cwd: string, target: string): Promise<string | null> {
  // Resolve path
  let path = target;
  if (target.startsWith('~/')) {
    path = '/home' + target.slice(1);
  } else if (target === '~') {
    path = '/home';
  } else if (!target.startsWith('/')) {
    path = (cwd === '/' ? '' : cwd) + '/' + target;
  }

  // Normalize ..
  const parts = path.split('/').filter(Boolean);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') stack.pop();
    else stack.push(part);
  }
  const normalizedPath = '/' + stack.join('/');

  // Read
  const handle = await getFileHandle(root, normalizedPath);
  if (!handle) return null;
  const file = await handle.getFile();
  return await file.text();
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
      // Try files map first (legacy/mock)
      if (ctx.files[args[0]]) {
        return textToStream(ctx.files[args[0]]);
      }
      // Try OPFS
      if (ctx.opfsRoot) {
        const target = args[0];
        return (async function* () {
          const content = await readFile(ctx.opfsRoot!, ctx.cwd, target);
          if (content !== null) {
            yield content;
          } else {
            yield `cat: ${target}: No such file\n`;
          }
        })();
      }

      return textToStream(`cat: ${args[0]}: No such file\n`);
    }
    return input;
  },
  grep: (args, input, ctx) => {
    const [pattern, file] = args;
    let source: Stream;
    if (file) {
      if (ctx.files[file]) {
        source = textToStream(ctx.files[file]);
      } else if (ctx.opfsRoot) {
        // Async source from OPFS
        source = (async function* () {
          const content = await readFile(ctx.opfsRoot!, ctx.cwd, file);
          if (content !== null) {
            for await (const chunk of chunkString(content)) yield chunk;
          } else {
            yield `grep: ${file}: No such file\n`;
          }
        })();
      } else {
        source = textToStream(`grep: ${file}: No such file\n`);
      }
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
        if (ctx.files[file]) {
          jsonText = ctx.files[file];
        } else if (ctx.opfsRoot) {
          const content = await readFile(ctx.opfsRoot!, ctx.cwd, file);
          if (content !== null) {
            jsonText = content;
          } else {
            yield `jq: ${file}: No such file\n`;
            return;
          }
        } else {
          yield `jq: ${file}: No such file\n`;
          return;
        }
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
    const ctx: Context = {
      files: data.files || {},
      opfsRoot: data.opfsRoot,
      cwd: data.cwd || '/home'
    };
    const stream = buildPipeline(data.command, ctx);
    for await (const chunk of stream) {
      (self as any).postMessage({ type: 'data', chunk } as DataResponse);
    }
    (self as any).postMessage({ type: 'end' } as EndResponse);
  }
};

export { };
