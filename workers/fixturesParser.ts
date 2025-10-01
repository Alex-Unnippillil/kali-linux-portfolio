import { createFrameDecoderStream } from '../utils/streams/frameDecoder';
import { createJsonlParserStream } from '../utils/streams/jsonlParser';
import { createLineSplitterStream } from '../utils/streams/lineSplitter';

interface StartMessage {
  type: 'start';
  totalBytes?: number;
}

interface ChunkMessage {
  type: 'chunk';
  chunk: ArrayBuffer;
}

interface EndMessage {
  type: 'end';
}

interface CancelMessage {
  type: 'cancel';
}

export type FixturesParserMessage =
  | StartMessage
  | ChunkMessage
  | EndMessage
  | CancelMessage;

let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
let reader: ReadableStreamDefaultReader<any> | null = null;
let readerPromise: Promise<void> | null = null;
let cancelled = false;
let processedBytes = 0;
let totalBytes = 0;
let results: any[] = [];

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
  const jsonlParser = createJsonlParserStream();

  const pipeline = frameDecoder.readable
    .pipeThrough(lineSplitter)
    .pipeThrough(jsonlParser);

  writer = frameDecoder.writable.getWriter();
  reader = pipeline.getReader();
  readerPromise = (async () => {
    while (true) {
      const { value, done } = await reader!.read();
      if (done) break;
      if (!value || cancelled) continue;
      if (value.type === 'json') {
        results.push(value.value);
      } else {
        results.push({ line: value.raw });
      }
    }
  })();
};

const reset = async () => {
  cancelled = false;
  processedBytes = 0;
  totalBytes = 0;
  results = [];
  await dispose();
  setupPipeline();
};

const reportProgress = () => {
  if (!totalBytes) return;
  (self as any).postMessage({
    type: 'progress',
    payload: Math.min(100, Math.round((processedBytes / totalBytes) * 100)),
  });
};

self.onmessage = async (event: MessageEvent<FixturesParserMessage>) => {
  const data = event.data;
  if (data.type === 'cancel') {
    cancelled = true;
    await dispose();
    (self as any).postMessage({ type: 'progress', payload: 0 });
    return;
  }
  if (data.type === 'start') {
    await reset();
    totalBytes = data.totalBytes ?? 0;
    return;
  }
  if (data.type === 'chunk') {
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
  if (data.type === 'end') {
    await writer?.close();
    await readerPromise;
    await dispose();
    if (!cancelled) {
      (self as any).postMessage({ type: 'progress', payload: 100 });
      (self as any).postMessage({ type: 'result', payload: results });
    }
  }
};

export {}; // ensure module scope
