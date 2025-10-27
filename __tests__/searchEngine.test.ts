import {
  buildSearchDocuments,
  normalizeSearchDocuments,
  rankSearchResults,
  type SearchDocument,
} from '../lib/search';

describe('search ranking', () => {
  it('prioritises exact title matches for projects', () => {
    const documents: SearchDocument[] = [
      {
        id: 'project:alpha',
        title: 'Alpha Offensive Simulator',
        summary: 'Alpha project covering offensive automation and tooling.',
        url: 'https://example.com/alpha',
        category: 'project',
        keywords: ['alpha', 'offensive'],
      },
      {
        id: 'doc:alpha-reference',
        title: 'Alpha Reference Sheet',
        summary: 'Reference notes that mention alpha behaviour in passing.',
        url: 'https://example.com/docs/alpha-reference',
        category: 'doc',
        keywords: ['alpha'],
      },
    ];

    const index = normalizeSearchDocuments(documents);
    const results = rankSearchResults('alpha offensive simulator', index, { limit: 2 });

    expect(results[0]).toBeDefined();
    expect(results[0]?.id).toBe('project:alpha');
    expect(results[0]?.category).toBe('project');
  });

  it('includes documentation entries from the default index', () => {
    const documents = buildSearchDocuments();
    const index = normalizeSearchDocuments(documents);
    const results = rankSearchResults('getting started', index, { limit: 5 });
    const docResult = results.find((result) => result.id === 'doc:getting-started');

    expect(docResult).toBeDefined();
    expect(docResult?.category).toBe('doc');
  });
});
