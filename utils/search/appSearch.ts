import Fuse from 'fuse.js';
import type { SearchDocument } from '../appCatalog';

export interface SearchMatch {
  key: string;
  indices: readonly [number, number][];
}

export interface SearchHit {
  id: string;
  score: number;
  matches: SearchMatch[];
}

const fuseOptions: Fuse.IFuseOptions<SearchDocument> = {
  includeMatches: true,
  ignoreLocation: true,
  threshold: 0.3,
  minMatchCharLength: 2,
  keys: [
    { name: 'title', weight: 0.5 },
    { name: 'tags', weight: 0.3 },
    { name: 'categoryLabel', weight: 0.2 },
  ],
};

export interface AppSearchEngine {
  search: (query: string) => SearchHit[];
}

export const createSearchEngine = (documents: SearchDocument[]): AppSearchEngine => {
  const fuse = new Fuse(documents, fuseOptions);

  return {
    search: (query: string) => {
      const normalized = query.trim();
      if (!normalized) {
        return documents.map((doc) => ({ id: doc.id, score: 0, matches: [] }));
      }

      return fuse.search(normalized).map((result) => ({
        id: result.item.id,
        score: result.score ?? 0,
        matches:
          result.matches?.map((match) => ({
            key: (match.key ?? '') as string,
            indices: match.indices as readonly [number, number][],
          })) ?? [],
      }));
    },
  };
};

export default createSearchEngine;
