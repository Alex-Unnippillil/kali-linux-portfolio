import { jsonChunker } from '../utils/streams/jsonChunker';

type FileSource = { kind: 'file'; file: File };
type UrlSource = { kind: 'url'; url: string };
type TextSource = { kind: 'text'; text: string };
type ParseSource = FileSource | UrlSource | TextSource;

type ParseCommand = { type: 'parse'; source: ParseSource };
type CancelCommand = { type: 'cancel' };
type WorkerCommand = ParseCommand | CancelCommand;

type ProgressPayload = {
  loaded: number;
  total: number | null;
  items: number;
  lines: number;
  done?: boolean;
};

type RowError = { line: number; message: string; raw: string };

type ResultPayload = {
  rows: any[];
  errors: RowError[];
};

type WorkerResponse =
  | { type: 'progress'; payload: ProgressPayload }
  | { type: 'result'; payload: ResultPayload }
  | { type: 'error'; payload: { message: string } }
  | { type: 'cancelled' };

const ctx = self as unknown as DedicatedWorkerGlobalScope;

const MAX_ERRORS = 50;
const DEFAULT_PROGRESS_THROTTLE_MS = 64;

let currentController: AbortController | null = null;
let currentParseId = 0;

ctx.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const message = event.data;
  if (message.type === 'cancel') {
    cancelCurrent();
    ctx.postMessage({ type: 'cancelled' } satisfies WorkerResponse);
    return;
  }
  if (message.type === 'parse') {
    startParse(message.source).catch((error) => {
      const err = error instanceof Error ? error : new Error(String(error));
      ctx.postMessage({ type: 'error', payload: { message: err.message } } satisfies WorkerResponse);
    });
  }
};

function cancelCurrent() {
  if (currentController) {
    currentController.abort();
    currentController = null;
  }
}

async function startParse(source: ParseSource) {
  cancelCurrent();
  const controller = new AbortController();
  currentController = controller;
  const parseId = ++currentParseId;

  try {
    const { stream, totalBytes } = await getStream(source);
    const rows: any[] = [];
    const errors: RowError[] = [];
    let lineNumber = 0;

    for await (const event of jsonChunker(stream, {
      totalBytes,
      signal: controller.signal,
      progressThrottleMs: DEFAULT_PROGRESS_THROTTLE_MS,
    })) {
      if (parseId !== currentParseId) {
        controller.abort();
        return;
      }

      if (event.type === 'item') {
        lineNumber += 1;
        rows.push(event.value);
      } else if (event.type === 'error') {
        lineNumber += 1;
        if (errors.length < MAX_ERRORS) {
          errors.push({ line: lineNumber, message: event.error.message, raw: event.raw });
        }
      } else if (event.type === 'progress') {
        ctx.postMessage({
          type: 'progress',
          payload: {
            loaded: event.loaded,
            total: event.total ?? null,
            items: rows.length,
            lines: lineNumber,
          },
        } satisfies WorkerResponse);
      }
    }

    if (!controller.signal.aborted) {
      ctx.postMessage({
        type: 'progress',
        payload: {
          loaded: totalBytes ?? rows.length,
          total: totalBytes ?? rows.length,
          items: rows.length,
          lines: lineNumber,
          done: true,
        },
      } satisfies WorkerResponse);
      ctx.postMessage({ type: 'result', payload: { rows, errors } } satisfies WorkerResponse);
    }
  } catch (error) {
    if (controller.signal.aborted) {
      return;
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      return;
    }
    throw error;
  } finally {
    if (currentController === controller) {
      currentController = null;
    }
  }
}

async function getStream(
  source: ParseSource,
): Promise<{ stream: ReadableStream<Uint8Array>; totalBytes?: number }> {
  if (source.kind === 'file') {
    const { file } = source;
    if (typeof file.stream === 'function') {
      return { stream: file.stream(), totalBytes: file.size };
    }
    const text = await file.text();
    return stringToStream(text);
  }
  if (source.kind === 'url') {
    const res = await fetch(source.url);
    if (!res.ok) {
      throw new Error(`Failed to fetch ${source.url}: ${res.status} ${res.statusText}`);
    }
    const totalHeader = res.headers.get('content-length');
    const totalBytes = totalHeader ? Number(totalHeader) : undefined;
    if (res.body) {
      return { stream: res.body, totalBytes };
    }
    const text = await res.text();
    const fallback = stringToStream(text);
    return { stream: fallback.stream, totalBytes: fallback.totalBytes };
  }
  return stringToStream(source.text);
}

function stringToStream(text: string): { stream: ReadableStream<Uint8Array>; totalBytes: number } {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(text);
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return { stream, totalBytes: bytes.byteLength };
}

export {}; // ensure module scope
