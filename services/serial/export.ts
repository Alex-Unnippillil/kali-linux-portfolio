export type SerialFrameDirection = 'in' | 'out' | 'system';

export interface SerialFrameMeta extends Record<string, unknown> {
  direction?: SerialFrameDirection;
  encoding?: string;
}

export interface SerialFrame {
  index: number;
  timestamp: number;
  delta: number;
  data: string;
  byteLength: number;
  meta: SerialFrameMeta;
}

export interface SerialExportHeader {
  version: number;
  format: 'serial-export';
  startedAt: number;
  exportedAt: number;
  frameCount: number;
  timezoneOffset: number;
  meta?: Record<string, unknown>;
}

export interface SerialExportEnvelope {
  header: SerialExportHeader;
  frames: SerialFrame[];
}

export interface RecordFrameOptions {
  timestamp?: number;
  meta?: SerialFrameMeta;
}

export type SerialExportFormat = 'json' | 'pcap';

const DEFAULT_ENCODING = 'utf-8';
const DEFAULT_DIRECTION: SerialFrameDirection = 'in';

const GLOBAL_HEADER_SIZE = 24;
const PACKET_HEADER_SIZE = 16;

const MAGIC_NUMBER = 0xa1b2c3d4;
const VERSION_MAJOR = 2;
const VERSION_MINOR = 4;
const SNAPLEN = 262144;
const LINKTYPE_USER0 = 147; // user-defined link type

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function cloneFrame(frame: SerialFrame, index: number): SerialFrame {
  return {
    index,
    timestamp: frame.timestamp,
    delta: frame.delta,
    data: frame.data,
    byteLength: frame.byteLength,
    meta: { ...frame.meta },
  };
}

function ensureMeta(meta?: SerialFrameMeta): SerialFrameMeta {
  return {
    direction: DEFAULT_DIRECTION,
    encoding: DEFAULT_ENCODING,
    ...meta,
  };
}

function chunkEncodedString(
  value: string,
  chunkSize: number,
): Uint8Array[] {
  const bytes = encoder.encode(value);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < bytes.length; i += chunkSize) {
    chunks.push(bytes.slice(i, i + chunkSize));
  }
  return chunks;
}

function buildGlobalHeader(): Uint8Array {
  const buffer = new ArrayBuffer(GLOBAL_HEADER_SIZE);
  const view = new DataView(buffer);
  view.setUint32(0, MAGIC_NUMBER, true);
  view.setUint16(4, VERSION_MAJOR, true);
  view.setUint16(6, VERSION_MINOR, true);
  view.setInt32(8, 0, true);
  view.setUint32(12, 0, true);
  view.setUint32(16, SNAPLEN, true);
  view.setUint32(20, LINKTYPE_USER0, true);
  return new Uint8Array(buffer);
}

function buildPacketHeader(
  timestamp: number,
  length: number,
): Uint8Array {
  const seconds = Math.floor(timestamp / 1000);
  const micros = Math.floor((timestamp % 1000) * 1000);
  const buffer = new ArrayBuffer(PACKET_HEADER_SIZE);
  const view = new DataView(buffer);
  view.setUint32(0, seconds, true);
  view.setUint32(4, micros, true);
  view.setUint32(8, length, true);
  view.setUint32(12, length, true);
  return new Uint8Array(buffer);
}

export class SerialExportSession {
  private frames: SerialFrame[] = [];
  private startTime: number;
  private lastTimestamp: number;
  private sessionMeta: Record<string, unknown>;
  private timezoneOffset: number;

  constructor(options: { startTime?: number; meta?: Record<string, unknown> } = {}) {
    this.startTime = options.startTime ?? Date.now();
    this.lastTimestamp = this.startTime;
    this.sessionMeta = options.meta ? { ...options.meta } : {};
    this.timezoneOffset = new Date().getTimezoneOffset();
  }

  static fromEnvelope(envelope: SerialExportEnvelope): SerialExportSession {
    const session = new SerialExportSession({
      startTime: envelope.header.startedAt,
      meta: envelope.header.meta,
    });
    session.frames = envelope.frames.map((frame, idx) =>
      cloneFrame(
        {
          ...frame,
          meta: ensureMeta(frame.meta),
        },
        idx,
      ),
    );
    session.lastTimestamp =
      session.frames[session.frames.length - 1]?.timestamp ?? session.startTime;
    return session;
  }

  reset(meta: Record<string, unknown> = {}): void {
    this.frames = [];
    this.startTime = Date.now();
    this.lastTimestamp = this.startTime;
    this.sessionMeta = { ...meta };
    this.timezoneOffset = new Date().getTimezoneOffset();
  }

  record(data: string, options: RecordFrameOptions = {}): SerialFrame {
    const timestamp = options.timestamp ?? Date.now();
    const delta = this.frames.length === 0 ? 0 : timestamp - this.lastTimestamp;
    const byteLength = encoder.encode(data).length;
    const frame: SerialFrame = {
      index: this.frames.length,
      timestamp,
      delta,
      data,
      byteLength,
      meta: ensureMeta(options.meta),
    };
    this.frames.push(frame);
    this.lastTimestamp = timestamp;
    return frame;
  }

  getFrames(): SerialFrame[] {
    return this.frames.map((frame, idx) => cloneFrame(frame, idx));
  }

  getHeader(): SerialExportHeader {
    return {
      version: 1,
      format: 'serial-export',
      startedAt: this.startTime,
      exportedAt: Date.now(),
      frameCount: this.frames.length,
      timezoneOffset: this.timezoneOffset,
      meta: Object.keys(this.sessionMeta).length ? { ...this.sessionMeta } : undefined,
    };
  }

  buildEnvelope(): SerialExportEnvelope {
    return {
      header: this.getHeader(),
      frames: this.getFrames(),
    };
  }

  toJSON(pretty = false): string {
    return JSON.stringify(this.buildEnvelope(), null, pretty ? 2 : 0);
  }

  async *jsonChunks(
    options: { chunkSize?: number; pretty?: boolean } = {},
  ): AsyncGenerator<Uint8Array> {
    const chunkSize = options.chunkSize && options.chunkSize > 0 ? options.chunkSize : 64 * 1024;
    if (options.pretty) {
      const prettyString = this.toJSON(true);
      for (const chunk of chunkEncodedString(prettyString, chunkSize)) {
        yield chunk;
      }
      return;
    }

    const header = this.getHeader();
    const headerJson = JSON.stringify(header);
    for (const chunk of chunkEncodedString(`{"header":${headerJson},"frames":[`, chunkSize)) {
      yield chunk;
    }

    for (let i = 0; i < this.frames.length; i += 1) {
      const frame = this.frames[i];
      const serialized = JSON.stringify(frame);
      const suffix = i === this.frames.length - 1 ? '' : ',';
      for (const chunk of chunkEncodedString(`${serialized}${suffix}`, chunkSize)) {
        yield chunk;
      }
    }

    for (const chunk of chunkEncodedString(']}', chunkSize)) {
      yield chunk;
    }
  }

  async *pcapChunks(): AsyncGenerator<Uint8Array> {
    yield buildGlobalHeader();

    const headerSnapshot = this.getHeader();
    const headerPayload = encoder.encode(
      JSON.stringify({ type: 'header', header: headerSnapshot }),
    );
    yield buildPacketHeader(this.startTime, headerPayload.length);
    yield headerPayload;

    for (const frame of this.frames) {
      const payload = encoder.encode(
        JSON.stringify({ type: 'frame', frame }),
      );
      yield buildPacketHeader(frame.timestamp, payload.length);
      yield payload;
    }
  }

  async streamToWritable(
    target:
      | WritableStreamDefaultWriter<Uint8Array>
      | { write: (chunk: Uint8Array) => Promise<any> | any; close?: () => Promise<any> | any },
    format: SerialExportFormat,
    options: { chunkSize?: number; pretty?: boolean } = {},
  ): Promise<void> {
    const writer = target as {
      write: (chunk: Uint8Array) => Promise<any> | any;
      close?: () => Promise<any> | any;
      releaseLock?: () => void;
    };
    const generator =
      format === 'pcap' ? this.pcapChunks() : this.jsonChunks(options);
    for await (const chunk of generator) {
      await writer.write(chunk);
    }
    if (typeof writer.close === 'function') {
      await writer.close();
    }
    if (typeof writer.releaseLock === 'function') {
      writer.releaseLock();
    }
  }

  async toUint8Array(
    format: SerialExportFormat,
    options: { chunkSize?: number; pretty?: boolean } = {},
  ): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    if (format === 'pcap') {
      for await (const chunk of this.pcapChunks()) {
        chunks.push(chunk);
      }
    } else {
      for await (const chunk of this.jsonChunks(options)) {
        chunks.push(chunk);
      }
    }
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
    const buffer = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }
    return buffer;
  }

  async toBlob(
    format: SerialExportFormat,
    options: { chunkSize?: number; pretty?: boolean } = {},
  ): Promise<Blob> {
    const array = await this.toUint8Array(format, options);
    const type = format === 'pcap' ? 'application/vnd.tcpdump.pcap' : 'application/json';
    return new Blob([array], { type });
  }
}

function parseHeaderFrame(payload: string): SerialExportHeader | null {
  try {
    const parsed = JSON.parse(payload);
    if (parsed && parsed.type === 'header' && parsed.header) {
      return parsed.header as SerialExportHeader;
    }
  } catch {
    return null;
  }
  return null;
}

function parseFramePayload(payload: string): SerialFrame | null {
  try {
    const parsed = JSON.parse(payload);
    if (parsed && parsed.type === 'frame' && parsed.frame) {
      const frame = parsed.frame as SerialFrame;
      return {
        ...frame,
        meta: ensureMeta(frame.meta),
      };
    }
    if (parsed && typeof parsed.data === 'string') {
      const meta = ensureMeta(parsed.meta as SerialFrameMeta | undefined);
      const timestamp = typeof parsed.timestamp === 'number' ? parsed.timestamp : Date.now();
      const delta = typeof parsed.delta === 'number' ? parsed.delta : 0;
      const byteLength = encoder.encode(parsed.data).length;
      return {
        index: typeof parsed.index === 'number' ? parsed.index : 0,
        timestamp,
        delta,
        data: parsed.data,
        byteLength,
        meta,
      };
    }
  } catch {
    return null;
  }
  return null;
}

export function parseSerialJson(json: string): SerialExportEnvelope {
  const envelope = JSON.parse(json) as SerialExportEnvelope;
  if (!envelope || !envelope.header || !Array.isArray(envelope.frames)) {
    throw new Error('Invalid serial export JSON');
  }
  return {
    header: {
      ...envelope.header,
      meta: envelope.header.meta,
    },
    frames: envelope.frames.map((frame, idx) => {
      const data = frame.data ?? '';
      const byteLength =
        typeof frame.byteLength === 'number' ? frame.byteLength : encoder.encode(data).length;
      return {
        index: idx,
        timestamp: frame.timestamp,
        delta: frame.delta,
        data,
        byteLength,
        meta: ensureMeta(frame.meta),
      };
    }),
  };
}

export function parseSerialPcap(buffer: ArrayBuffer): SerialExportEnvelope {
  const view = new DataView(buffer);
  if (view.byteLength < GLOBAL_HEADER_SIZE) {
    throw new Error('Unsupported pcap format');
  }
  const magic = view.getUint32(0, true);
  if (magic !== MAGIC_NUMBER) {
    throw new Error('Unsupported pcap format');
  }
  let offset = GLOBAL_HEADER_SIZE;
  let header: SerialExportHeader | null = null;
  const frames: SerialFrame[] = [];
  while (offset + PACKET_HEADER_SIZE <= buffer.byteLength) {
    const tsSec = view.getUint32(offset, true);
    const tsUsec = view.getUint32(offset + 4, true);
    const inclLen = view.getUint32(offset + 8, true);
    const dataOffset = offset + PACKET_HEADER_SIZE;
    offset = dataOffset + inclLen;
    if (offset > buffer.byteLength) break;
    const payload = new Uint8Array(buffer.slice(dataOffset, dataOffset + inclLen));
    const text = decoder.decode(payload);
    if (!header) {
      const parsedHeader = parseHeaderFrame(text);
      if (parsedHeader) {
        header = parsedHeader;
        continue;
      }
    }
    const frame = parseFramePayload(text);
    if (frame) {
      const timestamp = tsSec * 1000 + Math.floor(tsUsec / 1000);
      frames.push({
        ...frame,
        index: frames.length,
        timestamp,
      });
    }
  }
  const finalHeader: SerialExportHeader = header
    ? {
        ...header,
        frameCount: frames.length,
      }
    : {
        version: 1,
        format: 'serial-export',
        startedAt: frames[0]?.timestamp ?? Date.now(),
        exportedAt: Date.now(),
        frameCount: frames.length,
        timezoneOffset: new Date().getTimezoneOffset(),
      };
  return { header: finalHeader, frames };
}

export type SerialExportSource = string | ArrayBuffer | Uint8Array | Blob;

export async function parseSerialExport(
  source: SerialExportSource,
): Promise<SerialExportEnvelope> {
  if (typeof source === 'string') {
    return parseSerialJson(source);
  }
  if (source instanceof Blob) {
    const arrayBuffer = await source.arrayBuffer();
    return parseSerialExport(arrayBuffer);
  }
  if (source instanceof Uint8Array) {
    return parseSerialPcap(source.buffer);
  }
  if (source instanceof ArrayBuffer) {
    try {
      const text = decoder.decode(new Uint8Array(source));
      if (text.trim().startsWith('{')) {
        return parseSerialJson(text);
      }
    } catch {
      // ignore JSON parse attempt
    }
    return parseSerialPcap(source);
  }
  throw new Error('Unsupported serial export source');
}

export async function replaySerialExport(
  source: SerialExportEnvelope | SerialFrame[],
  emit: (frame: SerialFrame) => void | Promise<void>,
  options: { realtime?: boolean; paceMultiplier?: number; signal?: AbortSignal } = {},
): Promise<void> {
  const frames = Array.isArray(source) ? source : source.frames;
  const realtime = options.realtime ?? false;
  const paceMultiplier = options.paceMultiplier && options.paceMultiplier > 0 ? options.paceMultiplier : 1;
  let previousTimestamp = frames[0]?.timestamp ?? 0;
  for (const frame of frames) {
    if (options.signal?.aborted) {
      throw new Error('aborted');
    }
    if (realtime) {
      const delay = frame === frames[0] ? 0 : frame.timestamp - previousTimestamp;
      if (delay > 0) {
        await new Promise<void>((resolve) =>
          setTimeout(resolve, Math.max(0, Math.floor(delay / paceMultiplier))),
        );
      }
      previousTimestamp = frame.timestamp;
    }
    await emit(frame);
  }
}
