import { useCallback, useMemo } from 'react';
import synonymsData from '../data/search-synonyms.json';

type SearchSynonymConfig = Record<string, string | string[]>;

type SearchableApp = {
  id: string;
  title: string;
};

type SearchIndex = Map<string, string[]>;

const normalizeSynonyms = (apps: SearchableApp[]): SearchIndex => {
  const validIds = new Set(apps.map((app) => app.id));
  const aliasMap: SearchIndex = new Map();
  const config = synonymsData as SearchSynonymConfig;

  Object.entries(config).forEach(([alias, target]) => {
    const key = alias.trim().toLowerCase();
    if (!key) {
      return;
    }
    const ids = Array.isArray(target) ? target : [target];
    const unique = Array.from(new Set(ids.filter((id) => validIds.has(id))));
    if (unique.length > 0) {
      aliasMap.set(key, unique);
    }
  });

  return aliasMap;
};

export const useSearchIndex = <T extends SearchableApp>(apps: T[]) => {
  const aliasIndex = useMemo(() => normalizeSynonyms(apps), [apps]);

  const search = useCallback(
    (term: string): T[] => {
      const normalized = term.trim().toLowerCase();
      if (!normalized) {
        return apps;
      }

      const matchedIds = new Set<string>();

      aliasIndex.forEach((ids, alias) => {
        if (alias.includes(normalized)) {
          ids.forEach((id) => matchedIds.add(id));
        }
      });

      return apps.filter((app) => {
        if (matchedIds.has(app.id)) {
          return true;
        }
        return app.title.toLowerCase().includes(normalized);
      });
    },
    [aliasIndex, apps]
  );

  return { search };
};

export default useSearchIndex;
