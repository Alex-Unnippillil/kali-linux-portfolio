import { Unzip, Zip, ZipDeflate, ZipPassThrough, unzipSync } from 'fflate';

export type ArchiveFormat = 'zip' | 'tar';

export interface ArchiveEntry {
  path: string;
  file?: File;
  directory?: boolean;
  permissions?: number;
  lastModified?: number;
}

export interface ProgressCallback {
  (processed: number, total: number): void;
}

export interface CreateArchiveOptions {
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
}

export interface ExtractArchiveOptions {
  signal?: AbortSignal;
  onProgress?: ProgressCallback;
  onEntry: (entry: ExtractedEntryChunk) => void;
}

export interface ExtractedEntryChunk {
  path: string;
  chunk: Uint8Array;
  final: boolean;
  directory: boolean;
  permissions?: number;
  lastModified?: number;
}

function concatChunks(chunks: Uint8Array[], totalLength: number): Uint8Array {
  if (chunks.length === 1) return chunks[0];
  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function checkSignal(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Operation aborted', 'AbortError');
  }
}

async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  if (typeof (file as any).arrayBuffer === 'function') {
    return await file.arrayBuffer();
  }
  if (typeof (file as any).text === 'function') {
    const text = await file.text();
    return new TextEncoder().encode(text).buffer;
  }
  throw new Error('Unsupported file object');
}

async function streamFile(
  file: File,
  signal: AbortSignal | undefined,
  onChunk: (chunk: Uint8Array, final: boolean) => void,
) {
  const stream = (file as any).stream?.();
  if (stream && typeof stream.getReader === 'function') {
    const reader = stream.getReader();
    try {
      while (true) {
        checkSignal(signal);
        const { value, done } = await reader.read();
        if (value) {
          onChunk(value, !!done);
        }
        if (done) {
          if (!value) onChunk(new Uint8Array(0), true);
          break;
        }
      }
    } finally {
      reader.releaseLock();
    }
    return;
  }
  // Fallback for environments without File.stream().
  const buffer = new Uint8Array(await fileToArrayBuffer(file));
  checkSignal(signal);
  onChunk(buffer, true);
}

function normalizePath(path: string, isDirectory: boolean): string {
  const trimmed = path.replace(/\\/g, '/');
  if (!trimmed) return '';
  if (isDirectory && !trimmed.endsWith('/')) return `${trimmed}/`;
  return trimmed;
}

function permissionsToAttrs(permissions?: number): number | undefined {
  if (permissions == null) return undefined;
  return (permissions & 0xffff) << 16;
}

export async function createZipArchive(
  entries: ArchiveEntry[],
  options: CreateArchiveOptions = {},
): Promise<Uint8Array> {
  if (!entries.length) return new Uint8Array();
  const { signal, onProgress } = options;
  let processed = 0;
  const total = entries.reduce((acc, entry) => acc + (entry.file?.size || 0), 0);
  return await new Promise<Uint8Array>(async (resolve, reject) => {
    const chunks: Uint8Array[] = [];
    let length = 0;
    const zip = new Zip((err, chunk, final) => {
      if (err) {
        reject(err);
        return;
      }
      if (chunk) {
        chunks.push(chunk);
        length += chunk.length;
      }
      if (final) {
        resolve(concatChunks(chunks, length));
      }
    });

    const finalize = () => {
      try {
        zip.end();
      } catch (error) {
        reject(error);
      }
    };

    try {
      for (const entry of entries) {
        checkSignal(signal);
        const isDirectory = !!entry.directory;
        const path = normalizePath(entry.path, isDirectory);
        if (!path) {
          continue;
        }
        if (isDirectory) {
          const passThrough = new ZipPassThrough(path);
          passThrough.os = 3;
          const attrs = permissionsToAttrs(entry.permissions ?? 0o755);
          if (attrs != null) passThrough.attrs = attrs;
          if (entry.lastModified) passThrough.mtime = new Date(entry.lastModified);
          zip.add(passThrough);
          passThrough.push(new Uint8Array(0), true);
          continue;
        }
        if (!entry.file) continue;
        const deflate = new ZipDeflate(path);
        deflate.os = 3;
        const attrs = permissionsToAttrs(entry.permissions ?? 0o644);
        if (attrs != null) deflate.attrs = attrs;
        if (entry.lastModified) deflate.mtime = new Date(entry.lastModified);
        zip.add(deflate);
        await streamFile(entry.file, signal, (chunk, final) => {
          checkSignal(signal);
          processed += chunk.length;
          if (onProgress && total) onProgress(Math.min(processed, total), total);
          deflate.push(chunk, final);
        });
      }
      finalize();
    } catch (error) {
      zip.terminate();
      reject(error);
    }
  });
}

function writeOctal(value: number, size: number): string {
  const oct = value.toString(8);
  return oct.padStart(size - 1, '0') + '\0';
}

function encodeTarHeader(info: {
  name: string;
  mode: number;
  size: number;
  mtime: number;
  typeflag: number;
}): Uint8Array {
  const header = new Uint8Array(512);
  const textEncoder = new TextEncoder();
  const nameBytes = textEncoder.encode(info.name);
  header.set(nameBytes.slice(0, 100), 0);
  header.set(textEncoder.encode(writeOctal(info.mode, 8)).slice(0, 8), 100);
  header.set(textEncoder.encode(writeOctal(0, 8)).slice(0, 8), 108); // uid
  header.set(textEncoder.encode(writeOctal(0, 8)).slice(0, 8), 116); // gid
  header.set(textEncoder.encode(writeOctal(info.size, 12)).slice(0, 12), 124);
  header.set(textEncoder.encode(writeOctal(info.mtime, 12)).slice(0, 12), 136);
  header[156] = info.typeflag;
  header.set(textEncoder.encode('ustar\0'), 257);
  header.set(textEncoder.encode('00'), 263);
  const checksumField = new Uint8Array(8).fill(32);
  header.set(checksumField, 148);
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += header[i];
  header.set(textEncoder.encode(writeOctal(sum, 8)).slice(0, 8), 148);
  return header;
}

export async function createTarArchive(
  entries: ArchiveEntry[],
  options: CreateArchiveOptions = {},
): Promise<Uint8Array> {
  const { signal, onProgress } = options;
  let processed = 0;
  const total = entries.reduce((acc, entry) => acc + (entry.file?.size || 0), 0);
  const chunks: Uint8Array[] = [];
  let length = 0;

  const pushChunk = (chunk: Uint8Array) => {
    chunks.push(chunk);
    length += chunk.length;
  };

  for (const entry of entries) {
    checkSignal(signal);
    const isDirectory = !!entry.directory;
    const path = normalizePath(entry.path, isDirectory);
    if (!path) continue;
    const size = entry.file?.size || 0;
    const header = encodeTarHeader({
      name: path,
      mode: (entry.permissions ?? (isDirectory ? 0o755 : 0o644)) & 0o7777,
      size: isDirectory ? 0 : size,
      mtime: Math.floor((entry.lastModified ?? Date.now()) / 1000),
      typeflag: isDirectory ? 53 : 48,
    });
    pushChunk(header);
    if (!isDirectory && entry.file) {
      await streamFile(entry.file, signal, (chunk, final) => {
        checkSignal(signal);
        processed += chunk.length;
        if (onProgress && total) onProgress(Math.min(processed, total), total);
        pushChunk(chunk);
      });
      const remainder = size % 512;
      if (remainder) {
        pushChunk(new Uint8Array(512 - remainder));
      }
    }
  }
  pushChunk(new Uint8Array(512));
  pushChunk(new Uint8Array(512));
  return concatChunks(chunks, length);
}

export async function extractZipArchive(
  archive: File,
  options: ExtractArchiveOptions,
): Promise<void> {
  const { signal, onProgress, onEntry } = options;
  const total = archive.size || 0;
  let processed = 0;
  const entryPromises: Promise<void>[] = [];

  const canStream = typeof (archive as any).stream === 'function';

  const runStreaming = async () =>
    new Promise<void>(async (resolve, reject) => {
      const unzip = new Unzip((err, file) => {
        if (err) {
          reject(err);
          return;
        }
      const entryPromise = new Promise<void>((entryResolve, entryReject) => {
        const permissions = file.os === 3 && file.attrs != null ? (file.attrs >>> 16) & 0xffff : undefined;
        const lastModified = file.mtime ? file.mtime.getTime() : undefined;
        const directory = file.filename.endsWith('/') || (file.size === 0 && file.originalSize === 0 && file.filename.endsWith('/'));
        if (directory) {
          try {
            onEntry({
              path: file.filename,
              chunk: new Uint8Array(0),
              final: true,
              directory: true,
              permissions,
              lastModified,
            });
            entryResolve();
          } catch (callbackError) {
            entryReject(callbackError as Error);
          }
          return;
        }
        file.ondata = (dataErr, chunk, final) => {
          if (dataErr) {
            entryReject(dataErr);
            return;
          }
          try {
            onEntry({
              path: file.filename,
              chunk,
              final,
              directory,
              permissions,
              lastModified,
            });
            if (final) entryResolve();
          } catch (callbackError) {
            entryReject(callbackError as Error);
          }
        };
        Promise.resolve()
          .then(() => {
            file.start();
          })
          .catch((startError) => {
            entryReject(startError as Error);
          });
      });
      entryPromises.push(entryPromise);
    });

    try {
      const reader = archive.stream().getReader();
      while (true) {
        checkSignal(signal);
        const { value, done } = await reader.read();
        if (value) {
          processed += value.length;
          if (onProgress && total) onProgress(Math.min(processed, total), total);
          unzip.push(value, !!done);
        }
        if (done) break;
      }
      await Promise.all(entryPromises);
      resolve();
    } catch (error) {
      reject(error);
    }
  });

  try {
    if (!canStream) throw new Error('streaming-not-supported');
    await runStreaming();
  } catch (error) {
    const streamUnsupported =
      (error instanceof Error && error.message === 'streaming-not-supported') ||
      (!!error && typeof error === 'object' && 'start' in (error as Record<string, unknown>) && 'terminate' in (error as Record<string, unknown>));
    if (streamUnsupported) {
      const buffer = await fileToArrayBuffer(archive);
      checkSignal(signal);
      if (onProgress) onProgress(buffer.byteLength, buffer.byteLength);
      const files = unzipSync(new Uint8Array(buffer));
      for (const [path, data] of Object.entries(files)) {
        const directory = path.endsWith('/');
        onEntry({
          path,
          chunk: directory ? new Uint8Array(0) : new Uint8Array(data),
          final: true,
          directory,
          permissions: undefined,
          lastModified: undefined,
        });
      }
      return;
    }
    throw error;
  }
}

function decodeString(buffer: Uint8Array): string {
  const nulIndex = buffer.indexOf(0);
  const slice = nulIndex >= 0 ? buffer.subarray(0, nulIndex) : buffer;
  return new TextDecoder().decode(slice);
}

function parseOctal(buffer: Uint8Array): number {
  const str = decodeString(buffer).trim();
  if (!str) return 0;
  return parseInt(str, 8) || 0;
}

export async function extractTarArchive(
  archive: File,
  options: ExtractArchiveOptions,
): Promise<void> {
  const { signal, onProgress, onEntry } = options;
  const reader = archive.stream().getReader();
  let buffer = new Uint8Array(0);
  let processed = 0;
  const total = archive.size || 0;

  const ensure = async (size: number) => {
    while (buffer.length < size) {
      checkSignal(signal);
      const { value, done } = await reader.read();
      if (value) {
        processed += value.length;
        if (onProgress && total) onProgress(Math.min(processed, total), total);
        const combined = new Uint8Array(buffer.length + value.length);
        combined.set(buffer, 0);
        combined.set(value, buffer.length);
        buffer = combined;
      }
      if (done) break;
    }
    if (buffer.length < size) {
      throw new Error('Unexpected end of TAR archive');
    }
  };

  while (true) {
    await ensure(512);
    const header = buffer.subarray(0, 512);
    buffer = buffer.subarray(512);
    if (header.every((byte) => byte === 0)) {
      // Consume final block and exit
      if (buffer.length >= 512) {
        buffer = buffer.subarray(512);
      }
      break;
    }
    const name = decodeString(header.subarray(0, 100));
    const size = parseOctal(header.subarray(124, 136));
    const mode = parseOctal(header.subarray(100, 108));
    const mtime = parseOctal(header.subarray(136, 148)) * 1000;
    const typeflag = header[156];
    const directory = typeflag === 53 || name.endsWith('/');
    await ensure(size);
    const fileData = buffer.subarray(0, size);
    buffer = buffer.subarray(size);
    if (size % 512) {
      await ensure(512 - (size % 512));
      buffer = buffer.subarray(512 - (size % 512));
    }
    onEntry({
      path: name,
      chunk: directory ? new Uint8Array(0) : new Uint8Array(fileData),
      final: true,
      directory,
      permissions: mode,
      lastModified: mtime || undefined,
    });
  }
}

