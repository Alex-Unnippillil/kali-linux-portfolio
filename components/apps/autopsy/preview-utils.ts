'use client';

const BASE64_CLEAN_REGEX = /[^A-Za-z0-9+/=]/g;

export const PREVIEW_CHUNK_BYTES = 32 * 1024;
const DEFAULT_CHUNK_BYTES = 64 * 1024;

const PRINTABLE_SET = new Set<number>([
  9, // tab
  10, // lf
  13, // cr
]);
for (let i = 32; i <= 126; i += 1) {
  PRINTABLE_SET.add(i);
}

const extensionToMime: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  bmp: 'image/bmp',
  webp: 'image/webp',
  svg: 'image/svg+xml',
};

const getSanitizedBase64 = (value?: string): string => (value || '').replace(BASE64_CLEAN_REGEX, '');

const getNodeBuffer = () => {
  if (typeof globalThis === 'undefined') return undefined;
  const maybeBuffer = (globalThis as { Buffer?: { from: (input: string | ArrayBufferView, encoding?: string) => any } }).Buffer;
  return maybeBuffer;
};

const padBase64 = (value: string): string => {
  const remainder = value.length % 4;
  if (remainder === 0) return value;
  return `${value}${'='.repeat(4 - remainder)}`;
};

export const decodeBase64Chunk = (chunk: string): Uint8Array => {
  if (!chunk) return new Uint8Array(0);
  if (typeof atob === 'function') {
    const normalized = padBase64(chunk);
    const binary = atob(normalized);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }
  const NodeBuffer = getNodeBuffer();
  if (NodeBuffer) {
    const buf = NodeBuffer.from(padBase64(chunk), 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  throw new Error('No base64 decoder available in this environment');
};

const countPrintable = (bytes: Uint8Array): number => {
  let printable = 0;
  for (let i = 0; i < bytes.length; i += 1) {
    if (PRINTABLE_SET.has(bytes[i])) {
      printable += 1;
    }
  }
  return printable;
};

export const bytesToText = (bytes: Uint8Array): { text: string; isBinary: boolean } => {
  if (!bytes.length) return { text: '', isBinary: false };
  let text = '';
  try {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    text = decoder.decode(bytes);
  } catch {
    text = '';
  }
  const printable = countPrintable(bytes);
  const ratio = printable / bytes.length;
  const isBinary = ratio < 0.85;
  return {
    text: text.replace(/\u0000/g, '\uFFFD'),
    isBinary,
  };
};

export const bytesToHex = (bytes: Uint8Array, bytesPerRow = 16): string => {
  if (!bytes.length) return '';
  const rows: string[] = [];
  for (let i = 0; i < bytes.length; i += bytesPerRow) {
    const slice = bytes.slice(i, i + bytesPerRow);
    const hexPart = Array.from(slice)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    const asciiPart = Array.from(slice)
      .map((b) => (PRINTABLE_SET.has(b) ? String.fromCharCode(b) : '.'))
      .join('');
    const offset = i.toString(16).padStart(8, '0');
    const paddedHex = hexPart.padEnd(bytesPerRow * 3 - 1, ' ');
    rows.push(`${offset}  ${paddedHex}  ${asciiPart}`);
  }
  return rows.join('\n');
};

export interface PreviewComputation {
  text: string;
  hex: string;
  truncated: boolean;
  isBinary: boolean;
  previewByteLength: number;
  totalBytes: number;
}

export const estimateTotalBytes = (base64: string): number => {
  if (!base64) return 0;
  const sanitized = padBase64(getSanitizedBase64(base64));
  if (!sanitized.length) return 0;
  const padding = sanitized.endsWith('==') ? 2 : sanitized.endsWith('=') ? 1 : 0;
  return Math.max(0, (sanitized.length / 4) * 3 - padding);
};

export const buildPreviewFromBase64 = async (
  base64?: string,
  maxBytes = PREVIEW_CHUNK_BYTES,
): Promise<PreviewComputation> => {
  const sanitized = getSanitizedBase64(base64);
  if (!sanitized) {
    return {
      text: '',
      hex: '',
      truncated: false,
      isBinary: false,
      previewByteLength: 0,
      totalBytes: 0,
    };
  }
  const chunkChars = Math.max(4, Math.ceil(maxBytes / 3) * 4);
  const chunk = sanitized.slice(0, chunkChars);
  const bytes = decodeBase64Chunk(chunk);
  const { text, isBinary } = bytesToText(bytes);
  const hex = bytesToHex(bytes);
  return {
    text,
    hex,
    truncated: chunk.length < sanitized.length,
    isBinary,
    previewByteLength: bytes.length,
    totalBytes: estimateTotalBytes(sanitized),
  };
};

export const decodeBase64Fully = async (
  base64: string,
  chunkBytes = DEFAULT_CHUNK_BYTES,
): Promise<Uint8Array> => {
  const sanitized = getSanitizedBase64(base64);
  if (!sanitized) return new Uint8Array(0);
  const chunkChars = Math.max(4, Math.ceil(chunkBytes / 3) * 4);
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < sanitized.length; i += chunkChars) {
    const chunk = sanitized.slice(i, i + chunkChars);
    chunks.push(decodeBase64Chunk(chunk));
    if (chunks.length % 4 === 0) {
      // Yield to the event loop to keep UI responsive
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  const total = chunks.reduce((acc, item) => acc + item.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach((chunk) => {
    result.set(chunk, offset);
    offset += chunk.length;
  });
  return result;
};

export const guessMimeType = (name: string): string | undefined => {
  const extMatch = name.toLowerCase().match(/\.([a-z0-9]+)$/);
  if (!extMatch) return undefined;
  return extensionToMime[extMatch[1]];
};

export const computeSha256FromBase64 = async (base64: string): Promise<string> => {
  if (!base64) return '';
  const bytes = await decodeBase64Fully(base64);
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    try {
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    } catch {
      // fall through to empty return
    }
  }
  if (typeof window === 'undefined') {
    try {
      const { createHash } = await import('crypto');
      const hash = createHash('sha256');
      const NodeBuffer = getNodeBuffer();
      if (NodeBuffer) {
        hash.update(NodeBuffer.from(bytes));
      } else {
        hash.update(bytes);
      }
      return hash.digest('hex');
    } catch {
      return '';
    }
  }
  return '';
};

export const formatBytes = (bytes: number): string => {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  const fixed = unitIndex === 0 ? value.toFixed(0) : value.toFixed(1);
  return `${fixed} ${units[unitIndex]}`;
};

export interface PreviewPaneFile {
  name: string;
  base64: string;
  previewText: string;
  previewHex: string;
  truncated: boolean;
  isBinary: boolean;
  previewByteLength: number;
  totalBytes: number;
  isImage: boolean;
  mimeType?: string;
  hash?: string;
  known?: string | null;
}
