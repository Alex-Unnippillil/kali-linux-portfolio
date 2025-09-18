/// <reference lib="webworker" />

import { createSearchEngine } from '../utils/search/appSearch';
import type { SearchDocument, SearchHit } from '../utils/appCatalog';

interface InitMessage {
  type: 'init';
  payload: SearchDocument[];
}

interface SearchMessage {
  type: 'search';
  query: string;
}

type IncomingMessage = InitMessage | SearchMessage;

type WorkerResponse =
  | { type: 'ready'; total: number }
  | { type: 'results'; query: string; results: SearchHit[] };

let engine: ReturnType<typeof createSearchEngine> | null = null;

self.onmessage = (event: MessageEvent<IncomingMessage>) => {
  const message = event.data;

  if (message.type === 'init') {
    engine = createSearchEngine(message.payload);
    const total = message.payload.length;
    self.postMessage({ type: 'ready', total } satisfies WorkerResponse);
    return;
  }

  if (message.type === 'search') {
    if (!engine) {
      self.postMessage({ type: 'results', query: message.query, results: [] } satisfies WorkerResponse);
      return;
    }

    const results = engine.search(message.query);
    self.postMessage({ type: 'results', query: message.query, results } satisfies WorkerResponse);
  }
};

export default null;
