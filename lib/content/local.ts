import path from 'node:path';

import type { ContentItem, ContentProvider, ListContentOptions } from './provider';

export interface LocalContentProviderConfig {
  /** Optional override data set. */
  items?: ContentItem[];
  /** Load JSON data from a file relative to the project root. */
  filePath?: string;
}

export class LocalContentProvider implements ContentProvider {
  private readonly itemsPromise: Promise<ContentItem[]>;

  constructor(config: LocalContentProviderConfig = {}) {
    if (config.items) {
      this.itemsPromise = Promise.resolve(normalizeItems(config.items));
    } else if (config.filePath) {
      this.itemsPromise = loadFromFile(config.filePath).then(normalizeItems);
    } else {
      this.itemsPromise = Promise.resolve([]);
    }
  }

  private async getItems(): Promise<ContentItem[]> {
    const items = await this.itemsPromise;
    return items.slice();
  }

  async listContent(options: ListContentOptions = {}): Promise<ContentItem[]> {
    const { tag, limit } = options;
    const items = await this.getItems();

    let filtered = items;
    if (tag) {
      filtered = filtered.filter((item) => (item.tags ?? []).includes(tag));
    }

    if (typeof limit === 'number') {
      if (limit < 0) {
        return [];
      }

      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }

  async getContent(slug: string): Promise<ContentItem | null> {
    const items = await this.getItems();
    return items.find((item) => item.slug === slug) ?? null;
  }
}

export function createLocalContentProvider(config?: LocalContentProviderConfig): LocalContentProvider {
  return new LocalContentProvider(config);
}

async function loadFromFile(filePath: string): Promise<ContentItem[]> {
  if (!canUseNodeFs()) {
    throw new Error('LocalContentProvider with filePath is only available in a Node.js runtime.');
  }

  const fs = await import('node:fs/promises');
  const absolutePath = path.isAbsolute(filePath) ? filePath : path.join(process.cwd(), filePath);
  const raw = await fs.readFile(absolutePath, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error(`Expected JSON array but received ${typeof data}`);
  }

  return data as ContentItem[];
}

function normalizeItems(items: ContentItem[]): ContentItem[] {
  return items.map((item, index) => {
    if (!item.slug) {
      throw new Error(`Missing slug for item at index ${index}`);
    }

    if (!item.id) {
      return { ...item, id: item.slug };
    }

    return item;
  });
}

function canUseNodeFs(): boolean {
  return typeof process !== 'undefined' && Boolean(process?.versions?.node);
}
