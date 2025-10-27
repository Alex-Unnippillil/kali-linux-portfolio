import {
  buildNormalizedSearchIndex,
  rankSearchResults,
  type NormalizedSearchDocument,
  type RankedSearchResult,
} from '../lib/search';

type SearchWorkerRequest =
  | { type: 'search'; id: number; query: string; limit?: number }
  | { type: 'warmup' };

type SearchWorkerResponse =
  | { type: 'ready' }
  | { type: 'search-result'; id: number; results: RankedSearchResult[]; elapsed: number }
  | { type: 'search-error'; id: number; message: string };

let index: NormalizedSearchDocument[] | null = null;

const ensureIndex = (): NormalizedSearchDocument[] => {
  if (!index) {
    index = buildNormalizedSearchIndex();
  }
  return index;
};

const postMessageSafe = (message: SearchWorkerResponse) => {
  try {
    self.postMessage(message);
  } catch (error) {
    console.error('search.worker postMessage failed', error);
  }
};

postMessageSafe({ type: 'ready' });

self.addEventListener('message', (event: MessageEvent<SearchWorkerRequest>) => {
  const data = event.data;

  if (!data || typeof data !== 'object') {
    return;
  }

  if (data.type === 'warmup') {
    ensureIndex();
    return;
  }

  if (data.type === 'search') {
    const { query, limit, id } = data;

    const started = typeof performance !== 'undefined' ? performance.now() : Date.now();

    try {
      const results = rankSearchResults(query, ensureIndex(), { limit });
      const finished = typeof performance !== 'undefined' ? performance.now() : Date.now();
      postMessageSafe({ type: 'search-result', id, results, elapsed: finished - started });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown search error';
      postMessageSafe({ type: 'search-error', id, message });
    }
  }
});

export {};
