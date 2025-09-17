export const DEFAULT_THUMBNAIL_BUDGET = 10 * 1024 * 1024; // 10 MB

export interface ThumbnailEntry {
  dataUrl: string;
  bytes: number;
  updatedAt: number;
}

export interface UpsertResult {
  stored: boolean;
  evicted: string[];
}

const BASE64_HEADER_PATTERN = /^data:[^;]+;base64,/i;

export const estimateDataUrlSize = (dataUrl: string): number => {
  if (!dataUrl) return 0;
  const base64 = dataUrl.replace(BASE64_HEADER_PATTERN, '');
  if (!base64) return 0;
  const padding = (base64.match(/=+$/) || [''])[0].length;
  const rawLength = Math.ceil((base64.length * 3) / 4) - padding;
  return Number.isFinite(rawLength) && rawLength > 0 ? rawLength : 0;
};

export class ThumbnailCache {
  private readonly limit: number;
  private readonly entries: Map<string, ThumbnailEntry> = new Map();
  private totalBytes = 0;

  constructor(limit: number = DEFAULT_THUMBNAIL_BUDGET) {
    this.limit = limit;
  }

  has(id: string): boolean {
    return this.entries.has(id);
  }

  get(id: string): ThumbnailEntry | undefined {
    return this.entries.get(id);
  }

  touch(id: string): void {
    const entry = this.entries.get(id);
    if (entry) {
      entry.updatedAt = Date.now();
    }
  }

  delete(id: string): boolean {
    const entry = this.entries.get(id);
    if (!entry) return false;
    this.entries.delete(id);
    this.totalBytes = Math.max(0, this.totalBytes - entry.bytes);
    return true;
  }

  clear(): void {
    this.entries.clear();
    this.totalBytes = 0;
  }

  getTotalBytes(): number {
    return this.totalBytes;
  }

  prune(activeIds: Set<string>): string[] {
    if (this.entries.size === 0) return [];
    const removed: string[] = [];
    let nextTotal = this.totalBytes;
    this.entries.forEach((entry, key) => {
      if (!activeIds.has(key)) {
        removed.push(key);
        nextTotal -= entry.bytes;
      }
    });
    if (!removed.length) {
      return removed;
    }
    removed.forEach((id) => {
      this.entries.delete(id);
    });
    this.totalBytes = Math.max(0, nextTotal);
    return removed;
  }

  upsert(id: string, dataUrl: string): UpsertResult {
    const bytes = estimateDataUrlSize(dataUrl);
    if (bytes <= 0 || bytes > this.limit) {
      return { stored: false, evicted: [] };
    }

    const existing = this.entries.get(id);
    const baseTotal = this.totalBytes - (existing?.bytes ?? 0);
    let requiredTotal = baseTotal + bytes;

    const evictionOrder: string[] = [];

    if (requiredTotal > this.limit) {
      const ordered = Array.from(this.entries.entries())
        .filter(([key]) => key !== id)
        .sort((a, b) => a[1].updatedAt - b[1].updatedAt);
      for (const [key, entry] of ordered) {
        requiredTotal -= entry.bytes;
        evictionOrder.push(key);
        if (requiredTotal <= this.limit) break;
      }
      if (requiredTotal > this.limit) {
        return { stored: false, evicted: [] };
      }
    }

    if (existing) {
      this.entries.delete(id);
    }

    evictionOrder.forEach((key) => {
      this.entries.delete(key);
    });

    this.entries.set(id, {
      dataUrl,
      bytes,
      updatedAt: Date.now(),
    });

    this.totalBytes = requiredTotal;

    return { stored: true, evicted: evictionOrder };
  }
}
