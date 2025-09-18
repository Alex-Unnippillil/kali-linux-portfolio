import { trackEvent } from '@/lib/analytics-client';

export type EvidencePayload = ArrayBuffer | ArrayBufferView | Uint8Array | string;

const getTextEncoder = (): TextEncoder => {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder();
  }
  const { TextEncoder: NodeTextEncoder } = require('util') as typeof import('util');
  return new NodeTextEncoder();
};

const toUint8Array = (payload: EvidencePayload): Uint8Array => {
  if (typeof payload === 'string') {
    return getTextEncoder().encode(payload);
  }
  if (payload instanceof ArrayBuffer) {
    return new Uint8Array(payload.slice(0));
  }
  if (payload instanceof Uint8Array) {
    return new Uint8Array(payload);
  }
  if (ArrayBuffer.isView(payload)) {
    const view = new Uint8Array(payload.buffer, payload.byteOffset, payload.byteLength);
    return new Uint8Array(view);
  }
  throw new TypeError('Unsupported evidence payload type');
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

export async function hashEvidence(payload: EvidencePayload): Promise<string> {
  const bytes = toUint8Array(payload);
  const cryptoObj: Crypto | undefined =
    typeof globalThis === 'object' ? (globalThis as any).crypto : undefined;

  if (cryptoObj?.subtle) {
    const digest = await cryptoObj.subtle.digest('SHA-256', bytes);
    return toHex(digest);
  }

  try {
    const { createHash } = require('crypto') as typeof import('crypto');
    const hash = createHash('sha256');
    hash.update(Buffer.from(bytes));
    return hash.digest('hex');
  } catch (error) {
    throw new Error('SHA-256 hashing is not supported in this environment');
  }
}

export function formatTimestamp(date: Date): string {
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date provided to formatTimestamp');
  }
  const iso = date.toISOString();
  return `${iso.slice(0, 10)} ${iso.slice(11, 19)} UTC`;
}

export interface CaptureInput {
  id: string;
  label: string;
  type: string;
  payload: EvidencePayload;
  tags?: string[];
  metadata?: Record<string, unknown>;
  capturedAt?: Date;
}

export interface StoredCapture {
  id: string;
  label: string;
  type: string;
  tags: string[];
  capturedAt: Date;
  capturedAtIso: string;
  capturedAtDisplay: string;
  hash: string;
  size: number;
  payload: Uint8Array;
  metadata?: Record<string, unknown>;
}

export interface EvidenceManifestItem {
  id: string;
  label: string;
  type: string;
  capturedAt: string;
  timestamp: string;
  hash: string;
  size: number;
  tags: string[];
  metadata?: Record<string, unknown>;
}

export interface EvidenceManifest {
  version: string;
  generatedAt: string;
  totals: {
    captures: number;
    byType: Record<string, number>;
  };
  items: EvidenceManifestItem[];
  metadata?: Record<string, unknown>;
}

type Clock = () => Date;

export class EvidenceStore {
  private captures: StoredCapture[] = [];

  private captureCount = 0;

  private exportCount = 0;

  constructor(private readonly now: Clock = () => new Date()) {}

  async recordCapture(input: CaptureInput): Promise<StoredCapture> {
    const capturedAt = input.capturedAt ? new Date(input.capturedAt) : this.now();
    if (Number.isNaN(capturedAt.getTime())) {
      throw new Error('Invalid capture timestamp');
    }

    const payloadBytes = toUint8Array(input.payload);
    const hash = await hashEvidence(payloadBytes);
    const tags = input.tags ? [...input.tags] : [];

    const record: StoredCapture = {
      id: input.id,
      label: input.label,
      type: input.type,
      tags,
      capturedAt,
      capturedAtIso: capturedAt.toISOString(),
      capturedAtDisplay: formatTimestamp(capturedAt),
      hash,
      size: payloadBytes.byteLength,
      payload: new Uint8Array(payloadBytes),
      metadata: input.metadata ? { ...input.metadata } : undefined,
    };

    this.captures.push(record);
    this.captureCount += 1;
    trackEvent('evidence_capture', {
      totalCaptures: this.captureCount,
      type: input.type,
      size: record.size,
      hasMetadata: Boolean(record.metadata && Object.keys(record.metadata).length > 0),
    });

    return { ...record, tags: [...record.tags], payload: new Uint8Array(record.payload) };
  }

  list(): StoredCapture[] {
    return this.captures.map((capture) => ({
      ...capture,
      tags: [...capture.tags],
      payload: new Uint8Array(capture.payload),
      metadata: capture.metadata ? { ...capture.metadata } : undefined,
    }));
  }

  clear(): void {
    this.captures = [];
    this.captureCount = 0;
    this.exportCount = 0;
  }

  buildManifest(context: Record<string, unknown> = {}): EvidenceManifest {
    const generatedAt = this.now();
    if (Number.isNaN(generatedAt.getTime())) {
      throw new Error('Invalid manifest generation timestamp');
    }

    const items = this.captures
      .map((capture) => ({
        id: capture.id,
        label: capture.label,
        type: capture.type,
        capturedAt: capture.capturedAtIso,
        timestamp: capture.capturedAtDisplay,
        hash: capture.hash,
        size: capture.size,
        tags: [...capture.tags],
        ...(capture.metadata ? { metadata: { ...capture.metadata } } : {}),
      }))
      .sort((a, b) =>
        a.capturedAt === b.capturedAt
          ? a.id.localeCompare(b.id)
          : a.capturedAt.localeCompare(b.capturedAt),
      );

    const byType: Record<string, number> = {};
    for (const capture of this.captures) {
      byType[capture.type] = (byType[capture.type] ?? 0) + 1;
    }

    const manifest: EvidenceManifest = {
      version: '1.0',
      generatedAt: generatedAt.toISOString(),
      totals: {
        captures: this.captures.length,
        byType,
      },
      items,
      ...(Object.keys(context).length ? { metadata: { ...context } } : {}),
    };

    this.exportCount += 1;
    trackEvent('evidence_export', {
      totalExports: this.exportCount,
      capturedItems: this.captures.length,
      hasContext: Object.keys(context).length > 0,
    });

    return manifest;
  }

  getCaptureCount(): number {
    return this.captureCount;
  }

  getExportCount(): number {
    return this.exportCount;
  }
}

export default EvidenceStore;
