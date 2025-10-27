import {
  prepareSearchIndex,
  resetSearchIndex,
  runSearch,
  setSearchWorkerImplementationForTesting,
  type SearchDocument,
  type SearchQueryResponse,
} from '../lib/search';
import { SearchEngine } from '../lib/search/engine';

describe('search worker client', () => {
  const documents: SearchDocument[] = [
    { id: 'nmap', title: 'Nmap Scanner' },
    { id: 'wireshark', title: 'Wireshark Analyzer' },
  ];

  afterEach(async () => {
    setSearchWorkerImplementationForTesting(null);
    await resetSearchIndex();
    jest.useRealTimers();
  });

  it('delegates to the provided worker implementation', async () => {
    const engine = new SearchEngine();
    setSearchWorkerImplementationForTesting({
      async setDocuments(list) {
        engine.setDocuments(list);
      },
      async query({ query, options }) {
        return engine.query(query, options);
      },
      async clear() {
        engine.clear();
      },
    });

    await prepareSearchIndex(documents);
    const response = await runSearch('nmap');

    expect(response.results.map(r => r.id)).toEqual(['nmap']);
  });

  it('times out when the worker takes too long to respond', async () => {
    setSearchWorkerImplementationForTesting({
      async setDocuments() {},
      async query() {
        return new Promise<SearchQueryResponse>(resolve => {
          setTimeout(() => resolve({ results: [], metrics: { evaluated: 0, elapsedMs: 0 } }), 100);
        });
      },
      async clear() {},
    });

    await prepareSearchIndex(documents);
    await expect(runSearch('anything', { timeoutMs: 5 })).rejects.toThrow('Search timed out');
  });

  it('propagates worker errors', async () => {
    setSearchWorkerImplementationForTesting({
      async setDocuments() {},
      async query() {
        throw new Error('boom');
      },
      async clear() {},
    });

    await prepareSearchIndex(documents);

    await expect(runSearch('boom')).rejects.toThrow('boom');
  });
});
