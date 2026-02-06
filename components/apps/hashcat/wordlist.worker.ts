export {};

type CaseMode = 'preserve' | 'lower' | 'upper';

type WorkerRequest =
  | {
      type: 'process';
      payload: {
        lists: string[];
        options: {
          caseMode: CaseMode;
          dedupeCaseSensitive: boolean;
          trimWhitespace: boolean;
        };
      };
    }
  | { type: 'cancel' };

type WorkerProgressMessage = {
  type: 'progress';
  payload: {
    processed: number;
    total: number;
  };
};

type WorkerCompleteMessage = {
  type: 'complete';
  payload: {
    text: string;
    preview: string[];
    stats: {
      totalLines: number;
      unique: number;
      duplicatesRemoved: number;
      emptyLines: number;
      caseMode: CaseMode;
      caseSensitive: boolean;
      sizeBytes: number;
    };
  };
};

type WorkerErrorMessage = { type: 'error'; payload: string };
type WorkerCancelledMessage = { type: 'cancelled' };

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

let cancelRequested = false;

const forEachLine = (content: string, cb: (line: string) => void) => {
  if (!content) return;
  let buffer = '';
  for (let i = 0; i < content.length; i += 1) {
    const char = content[i];
    if (char === '\n') {
      let line = buffer;
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }
      cb(line);
      buffer = '';
      continue;
    }
    buffer += char;
  }
  if (buffer.length > 0) {
    let line = buffer;
    if (line.endsWith('\r')) {
      line = line.slice(0, -1);
    }
    cb(line);
  }
};

const countEntries = (content: string): number => {
  let count = 0;
  forEachLine(content, () => {
    count += 1;
  });
  return count;
};

const computeSizeBytes = (text: string): number => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(text).length;
  }
  return text.length;
};

const processLists = (payload: Extract<WorkerRequest, { type: 'process' }>['payload']) => {
  const { lists, options } = payload;
  cancelRequested = false;

  try {
    const total = lists.reduce((acc, content) => acc + countEntries(content), 0);

    if (cancelRequested) {
      ctx.postMessage({ type: 'cancelled' } satisfies WorkerCancelledMessage);
      return;
    }

    const seen = new Set<string>();
    const output: string[] = [];
    let duplicates = 0;
    let emptyLines = 0;
    let processed = 0;

    const emitProgress = () => {
      ctx.postMessage({
        type: 'progress',
        payload: { processed, total },
      } satisfies WorkerProgressMessage);
    };

    const handleLine = (rawLine: string) => {
      processed += 1;

      const trimmed = options.trimWhitespace ? rawLine.trim() : rawLine;
      if (!trimmed) {
        emptyLines += 1;
      } else {
        let normalized = trimmed;
        if (options.caseMode === 'lower') {
          normalized = trimmed.toLowerCase();
        } else if (options.caseMode === 'upper') {
          normalized = trimmed.toUpperCase();
        }

        const key = options.dedupeCaseSensitive ? normalized : normalized.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          output.push(normalized);
        } else {
          duplicates += 1;
        }
      }

      if (processed % 5000 === 0 || processed === total) {
        emitProgress();
      }

      if (cancelRequested) {
        throw new Error('cancelled');
      }
    };

    for (const content of lists) {
      if (!content) continue;
      forEachLine(content, handleLine);
    }

    const text = output.join('\n');

    ctx.postMessage({
      type: 'complete',
      payload: {
        text,
        preview: output.slice(0, 25),
        stats: {
          totalLines: processed,
          unique: output.length,
          duplicatesRemoved: duplicates,
          emptyLines,
          caseMode: options.caseMode,
          caseSensitive: options.dedupeCaseSensitive,
          sizeBytes: computeSizeBytes(text),
        },
      },
    } satisfies WorkerCompleteMessage);
  } catch (error) {
    if ((error as Error).message === 'cancelled') {
      ctx.postMessage({ type: 'cancelled' } satisfies WorkerCancelledMessage);
      return;
    }
    const message =
      error instanceof Error ? error.message : 'Failed to process wordlists';
    ctx.postMessage({ type: 'error', payload: message } satisfies WorkerErrorMessage);
  }
};

ctx.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type } = event.data;
  if (type === 'cancel') {
    cancelRequested = true;
    return;
  }
  if (type === 'process') {
    cancelRequested = false;
    processLists(event.data.payload);
  }
};
