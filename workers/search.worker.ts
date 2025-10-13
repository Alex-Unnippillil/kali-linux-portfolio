import { expose } from 'comlink';
import {
  SearchDocument,
  SearchEngine,
  SearchQueryOptions,
  SearchQueryResponse,
} from '../lib/search/engine';

type QueryPayload = {
  query: string;
  options?: SearchQueryOptions;
};

const engine = new SearchEngine();

const api = {
  async setDocuments(documents: SearchDocument[]): Promise<void> {
    engine.setDocuments(documents);
  },
  async query(payload: QueryPayload): Promise<SearchQueryResponse> {
    const { query, options } = payload;
    return engine.query(query, options);
  },
  async clear(): Promise<void> {
    engine.clear();
  },
};

type SearchWorkerApi = typeof api;

expose(api);

export type { SearchDocument, SearchQueryOptions, SearchQueryResponse, SearchWorkerApi };
export {};
