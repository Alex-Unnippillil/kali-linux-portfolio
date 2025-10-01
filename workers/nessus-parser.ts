import { XMLParser } from 'fast-xml-parser';
import { createFrameDecoderStream } from '../utils/streams/frameDecoder';
import { createLineSplitterStream } from '../utils/streams/lineSplitter';

export interface Finding {
  host: string;
  id: string;
  name: string;
  cvss: number;
  severity: string;
  description: string;
  solution: string;
}

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

export type NessusParserMessage =
  | StartMessage
  | ChunkMessage
  | EndMessage
  | CancelMessage;

class NessusStreamProcessor {
  private readonly parser = new XMLParser({ ignoreAttributes: false });
  private readonly lineStream = createLineSplitterStream();
  private readonly writer = this.lineStream.writable.getWriter();
  private readonly reader = this.lineStream.readable.getReader();
  private readonly readPromise: Promise<void>;
  private capturing = false;
  private hostBuffer = '';
  private readonly findings: Finding[] = [];

  constructor() {
    this.readPromise = this.consume();
  }

  private async consume(): Promise<void> {
    while (true) {
      const { value, done } = await this.reader.read();
      if (done) break;
      if (typeof value === 'string') {
        this.processLine(value);
      }
    }
  }

  private processLine(line: string): void {
    if (!this.capturing) {
      const startIdx = line.indexOf('<ReportHost');
      if (startIdx !== -1) {
        this.capturing = true;
        this.hostBuffer = line.slice(startIdx) + '\n';
        if (line.indexOf('</ReportHost>', startIdx) !== -1) {
          this.finalizeHost();
        }
        return;
      }
    } else {
      this.hostBuffer += line + '\n';
      if (line.includes('</ReportHost>')) {
        this.finalizeHost();
      }
    }
  }

  private finalizeHost(): void {
    if (!this.hostBuffer.trim()) {
      this.capturing = false;
      this.hostBuffer = '';
      return;
    }
    const wrapped = `<Root>${this.hostBuffer}</Root>`;
    try {
      const parsed = this.parser.parse(wrapped);
      const hostData = parsed?.Root?.ReportHost ?? parsed?.ReportHost ?? parsed;
      if (!hostData) {
        this.resetBuffer();
        return;
      }
      const hostName =
        hostData['@_name'] ||
        hostData?.HostProperties?.tag?.find(
          (t: any) => t['@_name'] === 'host-ip',
        )?.['#text'] ||
        'unknown';
      const items = hostData.ReportItem;
      const list = Array.isArray(items)
        ? items
        : items
        ? [items]
        : [];
      for (const item of list) {
        if (!item) continue;
        const finding: Finding = {
          host: String(hostName),
          id: String(item['@_pluginID'] ?? ''),
          name: item['@_pluginName'] || '',
          cvss: parseFloat(
            item.cvss3_base_score || item.cvss_base_score || '0',
          ),
          severity: item.risk_factor || 'Unknown',
          description: item.description || '',
          solution: item.solution || '',
        };
        this.findings.push(finding);
      }
    } catch (err) {
      throw err;
    } finally {
      this.resetBuffer();
    }
  }

  private resetBuffer(): void {
    this.capturing = false;
    this.hostBuffer = '';
  }

  async writeFrame(frame: Uint8Array): Promise<void> {
    await this.writer.write(frame);
  }

  async close(): Promise<Finding[]> {
    await this.writer.close();
    await this.readPromise;
    if (this.capturing && this.hostBuffer.includes('</ReportHost>')) {
      this.finalizeHost();
    }
    return this.findings;
  }
}

let frameWriter: WritableStreamDefaultWriter<Uint8Array> | null = null;
let frameReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
let framePromise: Promise<void> | null = null;
let processor: NessusStreamProcessor | null = null;
let cancelled = false;
let processedBytes = 0;
let totalBytes = 0;

const dispose = async () => {
  await frameWriter?.abort().catch(() => undefined);
  await frameReader?.cancel().catch(() => undefined);
  frameWriter = null;
  frameReader = null;
  framePromise = null;
  processor = null;
};

const setup = () => {
  processor = new NessusStreamProcessor();
  const decoder = createFrameDecoderStream();
  frameWriter = decoder.writable.getWriter();
  frameReader = decoder.readable.getReader();
  framePromise = (async () => {
    while (true) {
      const { value, done } = await frameReader!.read();
      if (done) break;
      if (value && processor) {
        await processor.writeFrame(value);
      }
    }
  })();
};

const reset = async () => {
  cancelled = false;
  processedBytes = 0;
  totalBytes = 0;
  await dispose();
  setup();
};

const encodeProgress = () => {
  if (!totalBytes) return;
  (self as any).postMessage({
    type: 'progress',
    progress: Math.min(1, processedBytes / totalBytes),
  });
};

self.onmessage = async (event: MessageEvent<NessusParserMessage | ArrayBuffer | string>) => {
  const data = event.data as NessusParserMessage | ArrayBuffer | string;
  if (typeof data === 'string') {
    const findings = await parseNessus(data);
    (self as any).postMessage({ findings });
    return;
  }
  if (data instanceof ArrayBuffer) {
    const findings = await parseNessus(new Uint8Array(data));
    (self as any).postMessage({ findings });
    return;
  }
  if ((data as NessusParserMessage).type === 'cancel') {
    cancelled = true;
    await dispose();
    return;
  }
  if ((data as NessusParserMessage).type === 'start') {
    await reset();
    totalBytes = (data as StartMessage).totalBytes ?? 0;
    return;
  }
  if ((data as NessusParserMessage).type === 'chunk') {
    if (!frameWriter) {
      await reset();
      totalBytes = (data as ChunkMessage).chunk.byteLength;
    }
    const chunk = new Uint8Array((data as ChunkMessage).chunk);
    processedBytes += chunk.byteLength;
    await frameWriter!.write(chunk);
    encodeProgress();
    return;
  }
  if ((data as NessusParserMessage).type === 'end') {
    try {
      await frameWriter?.close();
      await framePromise;
      if (!processor) {
        (self as any).postMessage({ findings: [] });
        return;
      }
      const findings = await processor.close();
      if (!cancelled) {
        (self as any).postMessage({ findings });
      }
    } catch (err: any) {
      if (!cancelled) {
        (self as any).postMessage({ error: err?.message || 'Parse failed' });
      }
    } finally {
      await dispose();
    }
  }
};

export const parseNessus = async (
  input: string | Uint8Array | ArrayBuffer | ReadableStream<Uint8Array>,
): Promise<Finding[]> => {
  const processor = new NessusStreamProcessor();
  const feed = async (chunk: Uint8Array) => {
    await processor.writeFrame(chunk);
  };
  if (typeof input === 'string') {
    const encoder = new TextEncoder();
    await feed(encoder.encode(input));
  } else if (input instanceof Uint8Array) {
    await feed(input);
  } else if (input instanceof ArrayBuffer) {
    await feed(new Uint8Array(input));
  } else if (input && typeof (input as ReadableStream<Uint8Array>).getReader === 'function') {
    const reader = (input as ReadableStream<Uint8Array>).getReader();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      if (value) await feed(value instanceof Uint8Array ? value : new Uint8Array(value));
    }
  }
  return processor.close();
};

export {};
