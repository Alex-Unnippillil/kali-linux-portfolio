import { Deflate, Inflate } from 'pako';

export const COMPRESSION_THRESHOLD = 512 * 1024; // 512KB
const DEFAULT_CHUNK_SIZE = 32 * 1024;
const RECORD_VERSION = 1 as const;

type SupportedEncoding = 'identity' | 'gzip';

export interface CacheRecord {
  version: typeof RECORD_VERSION;
  encoding: SupportedEncoding;
  originalSize: number;
  compressedSize: number;
  payload: string;
}

export type CachePayload<T> = T | CacheRecord | null | undefined;

type CompressionOptions = {
  threshold?: number;
  chunkSize?: number;
};

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function isCacheRecord(value: unknown): value is CacheRecord {
  return (
    typeof value === 'object' &&
    value !== null &&
    'version' in value &&
    (value as any).version === RECORD_VERSION &&
    'encoding' in value &&
    (value as any).encoding &&
    'payload' in value
  );
}

function toBase64(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64');
  }
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(value, 'base64'));
  }
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function concatChunks(chunks: Uint8Array[], total: number): Uint8Array {
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

interface CompressionStreamLike {
  readonly readable: ReadableStream<Uint8Array>;
  readonly writable: WritableStream<Uint8Array>;
}

declare const CompressionStream: {
  prototype: CompressionStreamLike;
  new (format: SupportedEncoding): CompressionStreamLike;
};

declare const DecompressionStream: {
  prototype: CompressionStreamLike;
  new (format: SupportedEncoding): CompressionStreamLike;
};

function hasCompressionStream(): boolean {
  return typeof CompressionStream !== 'undefined' && typeof ReadableStream !== 'undefined';
}

function hasDecompressionStream(): boolean {
  return typeof DecompressionStream !== 'undefined' && typeof ReadableStream !== 'undefined';
}

async function compressWithStreams(data: Uint8Array, chunkSize: number): Promise<Uint8Array> {
  const stream = new CompressionStream('gzip');
  const writer = stream.writable.getWriter();
  try {
    for (let offset = 0; offset < data.length; offset += chunkSize) {
      const slice = data.subarray(offset, Math.min(offset + chunkSize, data.length));
      await writer.write(slice);
    }
    await writer.close();
    return await readStream(stream.readable);
  } finally {
    writer.releaseLock();
  }
}

async function decompressWithStreams(data: Uint8Array, chunkSize: number): Promise<Uint8Array> {
  const stream = new DecompressionStream('gzip');
  const writer = stream.writable.getWriter();
  try {
    for (let offset = 0; offset < data.length; offset += chunkSize) {
      const slice = data.subarray(offset, Math.min(offset + chunkSize, data.length));
      await writer.write(slice);
    }
    await writer.close();
    return await readStream(stream.readable);
  } finally {
    writer.releaseLock();
  }
}

async function readStream(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) {
      chunks.push(value);
      total += value.length;
    }
  }
  reader.releaseLock();
  return concatChunks(chunks, total);
}

async function compressWithPako(data: Uint8Array, chunkSize: number): Promise<Uint8Array> {
  const deflate = new Deflate({ gzip: true });
  const chunks: Uint8Array[] = [];
  let total = 0;
  deflate.onData = (chunk: Uint8Array) => {
    chunks.push(chunk);
    total += chunk.length;
  };
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const slice = data.subarray(offset, Math.min(offset + chunkSize, data.length));
    deflate.push(slice, offset + slice.length >= data.length);
    if (deflate.err) {
      throw new Error(deflate.msg || 'Compression failed');
    }
  }
  return concatChunks(chunks, total);
}

async function decompressWithPako(data: Uint8Array, chunkSize: number): Promise<Uint8Array> {
  const inflate = new Inflate({ windowBits: 15 + 32 });
  const chunks: Uint8Array[] = [];
  let total = 0;
  inflate.onData = (chunk: Uint8Array) => {
    chunks.push(chunk);
    total += chunk.length;
  };
  for (let offset = 0; offset < data.length; offset += chunkSize) {
    const slice = data.subarray(offset, Math.min(offset + chunkSize, data.length));
    inflate.push(slice, offset + slice.length >= data.length);
    if (inflate.err) {
      throw new Error(inflate.msg || 'Decompression failed');
    }
  }
  return concatChunks(chunks, total);
}

function decompressWithPakoSync(data: Uint8Array): Uint8Array {
  const inflate = new Inflate({ windowBits: 15 + 32 });
  const chunks: Uint8Array[] = [];
  let total = 0;
  inflate.onData = (chunk: Uint8Array) => {
    chunks.push(chunk);
    total += chunk.length;
  };
  inflate.push(data, true);
  if (inflate.err) {
    throw new Error(inflate.msg || 'Decompression failed');
  }
  return concatChunks(chunks, total);
}

function compressWithPakoSync(data: Uint8Array): Uint8Array {
  const deflate = new Deflate({ gzip: true });
  const chunks: Uint8Array[] = [];
  let total = 0;
  deflate.onData = (chunk: Uint8Array) => {
    chunks.push(chunk);
    total += chunk.length;
  };
  deflate.push(data, true);
  if (deflate.err) {
    throw new Error(deflate.msg || 'Compression failed');
  }
  return concatChunks(chunks, total);
}

async function compressBytes(data: Uint8Array, chunkSize: number): Promise<Uint8Array> {
  if (hasCompressionStream()) {
    return compressWithStreams(data, chunkSize);
  }
  return compressWithPako(data, chunkSize);
}

async function decompressBytes(data: Uint8Array, chunkSize: number): Promise<Uint8Array> {
  if (hasDecompressionStream()) {
    return decompressWithStreams(data, chunkSize);
  }
  return decompressWithPako(data, chunkSize);
}

export async function encodeCacheValue(
  value: unknown,
  options: CompressionOptions = {},
): Promise<CacheRecord> {
  const threshold = options.threshold ?? COMPRESSION_THRESHOLD;
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const normalized = value === undefined ? null : value;
  const serialized = JSON.stringify(normalized);
  const payload = serialized ?? 'null';
  const originalBytes = textEncoder.encode(payload);
  if (originalBytes.byteLength < threshold) {
    return {
      version: RECORD_VERSION,
      encoding: 'identity',
      originalSize: originalBytes.byteLength,
      compressedSize: originalBytes.byteLength,
      payload,
    };
  }
  const compressedBytes = await compressBytes(originalBytes, chunkSize);
  if (compressedBytes.byteLength >= originalBytes.byteLength) {
    return {
      version: RECORD_VERSION,
      encoding: 'identity',
      originalSize: originalBytes.byteLength,
      compressedSize: originalBytes.byteLength,
      payload,
    };
  }
  return {
    version: RECORD_VERSION,
    encoding: 'gzip',
    originalSize: originalBytes.byteLength,
    compressedSize: compressedBytes.byteLength,
    payload: toBase64(compressedBytes),
  };
}

export function encodeCacheValueSync(
  value: unknown,
  options: CompressionOptions = {},
): CacheRecord {
  const threshold = options.threshold ?? COMPRESSION_THRESHOLD;
  const normalized = value === undefined ? null : value;
  const serialized = JSON.stringify(normalized);
  const payload = serialized ?? 'null';
  const originalBytes = textEncoder.encode(payload);
  if (originalBytes.byteLength < threshold) {
    return {
      version: RECORD_VERSION,
      encoding: 'identity',
      originalSize: originalBytes.byteLength,
      compressedSize: originalBytes.byteLength,
      payload,
    };
  }
  try {
    const compressedBytes = compressWithPakoSync(originalBytes);
    if (compressedBytes.byteLength >= originalBytes.byteLength) {
      return {
        version: RECORD_VERSION,
        encoding: 'identity',
        originalSize: originalBytes.byteLength,
        compressedSize: originalBytes.byteLength,
        payload,
      };
    }
    return {
      version: RECORD_VERSION,
      encoding: 'gzip',
      originalSize: originalBytes.byteLength,
      compressedSize: compressedBytes.byteLength,
      payload: toBase64(compressedBytes),
    };
  } catch {
    return {
      version: RECORD_VERSION,
      encoding: 'identity',
      originalSize: originalBytes.byteLength,
      compressedSize: originalBytes.byteLength,
      payload,
    };
  }
}

export async function decodeCacheValue<T>(
  value: CachePayload<T>,
  options: CompressionOptions = {},
): Promise<T | undefined> {
  if (value === null || value === undefined) return undefined;
  if (!isCacheRecord(value)) {
    return value as T;
  }
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  if (value.encoding === 'identity') {
    try {
      return JSON.parse(value.payload) as T;
    } catch {
      return undefined;
    }
  }
  try {
    const bytes = fromBase64(value.payload);
    const decompressed = await decompressBytes(bytes, chunkSize);
    return JSON.parse(textDecoder.decode(decompressed)) as T;
  } catch {
    return undefined;
  }
}

export { isCacheRecord };

export function decodeCacheValueSync<T>(value: CachePayload<T>): T | undefined {
  if (value === null || value === undefined) return undefined;
  if (!isCacheRecord(value)) {
    return value as T;
  }
  if (value.encoding === 'identity') {
    try {
      return JSON.parse(value.payload) as T;
    } catch {
      return undefined;
    }
  }
  try {
    const bytes = fromBase64(value.payload);
    const decompressed = decompressWithPakoSync(bytes);
    return JSON.parse(textDecoder.decode(decompressed)) as T;
  } catch {
    return undefined;
  }
}
