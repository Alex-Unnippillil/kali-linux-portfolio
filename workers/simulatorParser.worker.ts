import { createFrameDecoderStream } from '../utils/streams/frameDecoder';
import { createLineSplitterStream } from '../utils/streams/lineSplitter';

export interface StartMessage {
  action: 'start';
  totalBytes?: number;
}

export interface ChunkMessage {
  action: 'chunk';
  chunk: ArrayBuffer;
}

export interface EndMessage {
  action: 'end';
}

export interface CancelMessage {
  action: 'cancel';
}

export type SimulatorParserRequest =
  | StartMessage
  | ChunkMessage
  | EndMessage
  | CancelMessage;

export interface ParsedLine {
  line: number;
  key: string;
  value: string;
  raw: string;
}

export interface ProgressMessage {
  type: 'progress';
  progress: number;
  eta: number;
}

export interface DoneMessage {
  type: 'done';
  parsed: ParsedLine[];
}

export interface CancelledMessage {
  type: 'cancelled';
}

export type SimulatorParserResponse =
  | ProgressMessage
  | DoneMessage
  | CancelledMessage;

let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let reader: ReadableStreamDefaultReader<string> | null = null;
let readerPromise: Promise<void> | null = null;
let cancelled = false;
let processedBytes = 0;
let totalBytes = 0;
let lines: ParsedLine[] = [];
let startTime = 0;
let lineCounter = 0;

const dispose = async () => {
  await writer?.abort().catch(() => undefined);
  await reader?.cancel().catch(() => undefined);
  writer = null;
  reader = null;
  readerPromise = null;
};

const setupPipeline = () => {
  const frameDecoder = createFrameDecoderStream();
  const lineSplitter = createLineSplitterStream();

  const pipeline = frameDecoder.readable.pipeThrough(lineSplitter);
  writer = frameDecoder.writable.getWriter();
  reader = pipeline.getReader();
  readerPromise = (async () => {
    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;
      if (typeof value !== 'string' || cancelled) continue;
      lineCounter += 1;
      const [key, ...rest] = value.split(':');
      lines.push({
        line: lineCounter,
        key: key.trim(),
        value: rest.join(':').trim(),
        raw: value,
      });
      if (lineCounter % 100 === 0) {
        reportProgress();
      }
    }
  })();
};

const reset = async () => {
  cancelled = false;
  processedBytes = 0;
  totalBytes = 0;
  lines = [];
  startTime = Date.now();
  lineCounter = 0;
  await dispose();
  setupPipeline();
};

const reportProgress = () => {
  if (!totalBytes) return;
  const progress = processedBytes / totalBytes;
  const elapsed = Date.now() - startTime;
  const eta = progress > 0 ? (elapsed * (1 - progress)) / progress : 0;
  (self as any).postMessage({ type: 'progress', progress, eta });
};

self.onmessage = async ({ data }: MessageEvent<SimulatorParserRequest>) => {
  if (data.action === 'cancel') {
    cancelled = true;
    await dispose();
    (self as any).postMessage({ type: 'cancelled' } as SimulatorParserResponse);
    return;
  }
  if (data.action === 'start') {
    await reset();
    totalBytes = data.totalBytes ?? 0;
    return;
  }
  if (data.action === 'chunk') {
    if (!writer) {
      await reset();
      totalBytes = data.chunk.byteLength;
    }
    const chunk = new Uint8Array(data.chunk);
    processedBytes += chunk.byteLength;
    await writer!.write(chunk);
    reportProgress();
    return;
  }
  if (data.action === 'end') {
    await writer?.close();
    await readerPromise;
    await dispose();
    if (!cancelled) {
      (self as any).postMessage({ type: 'done', parsed: lines } as SimulatorParserResponse);
    }
  }
};

export {};
