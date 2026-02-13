export interface BlobEntry {
  blob: Blob;
  url: string;
  timestamp: number;
}

export default class BlobManager {
  private entries: Map<string, BlobEntry> = new Map();

  set(key: string, blob: Blob): string {
    if (typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') {
      return '';
    }

    const existing = this.entries.get(key);
    if (existing) {
      URL.revokeObjectURL(existing.url);
    }

    const url = URL.createObjectURL(blob);
    this.entries.set(key, {
      blob,
      url,
      timestamp: Date.now(),
    });

    return url;
  }

  getUrl(key: string): string | undefined {
    return this.entries.get(key)?.url;
  }

  get(key: string): Blob | undefined {
    return this.entries.get(key)?.blob;
  }

  has(key: string): boolean {
    return this.entries.has(key);
  }

  revoke(key: string): void {
    const entry = this.entries.get(key);
    if (!entry) return;
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      URL.revokeObjectURL(entry.url);
    }
    this.entries.delete(key);
  }

  clear(): void {
    if (typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
      for (const entry of this.entries.values()) {
        URL.revokeObjectURL(entry.url);
      }
    }
    this.entries.clear();
  }
}
