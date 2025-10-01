import {
  ensureLineageCollection,
  formatLineageSummary,
  mergeLineage,
  withLineage,
} from '../utils/lineage';

describe('lineage utilities', () => {
  it('merges lineage metadata with defaults and updates', () => {
    const base = mergeLineage(
      { source: 'fixture', transforms: ['load'], tags: ['demo'] },
      { transforms: ['normalize'], tags: ['autopsy'] },
      { tags: ['base'], transforms: ['ingest'] },
    );

    expect(base.source).toBe('fixture');
    expect(base.transforms).toEqual(['ingest', 'load', 'normalize']);
    expect(base.tags).toEqual(['base', 'demo', 'autopsy']);
  });

  it('ensures lineage is attached to a collection with extra tags', () => {
    const enriched = ensureLineageCollection(
      [
        { name: 'artifact', type: 'Document', plugin: 'metadata' },
      ],
      { source: 'test' },
      {
        getExtraTags: (item) => [
          item.type ? `type:${item.type}` : undefined,
          item.plugin ? `plugin:${item.plugin}` : undefined,
        ].filter((value): value is string => Boolean(value)),
      },
    );

    expect(enriched[0].lineage.source).toBe('test');
    expect(enriched[0].tags).toEqual(['type:Document', 'plugin:metadata']);
  });

  it('formats lineage summaries with source, transforms, and tags', () => {
    const item = withLineage(
      { lineage: { source: 'fixture', transforms: ['load'], tags: ['demo'] } },
      {},
      { transforms: ['analyze'], tags: ['report'] },
    );

    expect(formatLineageSummary(item.lineage)).toBe(
      'Source: fixture • Transforms: load → analyze • Tags: demo, report',
    );
  });
});
