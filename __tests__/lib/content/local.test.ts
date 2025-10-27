import fs from 'node:fs/promises';
import path from 'node:path';

import { createLocalContentProvider, LocalContentProvider } from '../../../lib/content/local';
import type { ContentItem } from '../../../lib/content/provider';

describe('LocalContentProvider', () => {
  const sampleItems: ContentItem[] = [
    {
      id: 'a',
      slug: 'alpha',
      title: 'Alpha',
      excerpt: 'First entry',
      body: 'Alpha body',
      tags: ['demo', 'general'],
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'b',
      slug: 'beta',
      title: 'Beta',
      tags: ['demo'],
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
    {
      id: 'c',
      slug: 'gamma',
      title: 'Gamma',
      tags: ['general'],
      updatedAt: '2024-01-03T00:00:00.000Z',
    },
  ];

  it('returns all entries by default', async () => {
    const provider = new LocalContentProvider({ items: sampleItems });
    const list = await provider.listContent();
    expect(list).toHaveLength(3);
    expect(list.map((item) => item.slug)).toEqual(['alpha', 'beta', 'gamma']);
  });

  it('filters by tag and respects limit', async () => {
    const provider = createLocalContentProvider({ items: sampleItems });
    const list = await provider.listContent({ tag: 'general', limit: 1 });
    expect(list).toHaveLength(1);
    expect(list[0].slug).toBe('alpha');
  });

  it('returns an individual entry by slug', async () => {
    const provider = new LocalContentProvider({ items: sampleItems });
    const item = await provider.getContent('beta');
    expect(item?.id).toBe('b');
  });

  it('returns null when the entry does not exist', async () => {
    const provider = new LocalContentProvider({ items: sampleItems });
    const item = await provider.getContent('missing');
    expect(item).toBeNull();
  });

  it('loads entries from a JSON file', async () => {
    const tmpFile = path.join(__dirname, 'local-provider-data.json');
    await fs.writeFile(tmpFile, JSON.stringify(sampleItems), 'utf8');

    try {
      const provider = new LocalContentProvider({ filePath: tmpFile });
      const item = await provider.getContent('gamma');
      expect(item?.title).toBe('Gamma');
    } finally {
      await fs.unlink(tmpFile);
    }
  });
});
