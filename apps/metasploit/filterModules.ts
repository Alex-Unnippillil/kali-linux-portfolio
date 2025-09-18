import type { NormalizedModule } from './moduleData';

export interface ModuleFilters {
  query?: string;
  tag?: string;
  platform?: string;
  rank?: string;
}

export interface FilterOptions {
  cache?: Map<string, NormalizedModule[]>;
  cacheKey?: string;
}

const normalize = (value?: string) => value?.trim().toLowerCase() ?? '';

export const createFilterCacheKey = (filters: ModuleFilters): string => {
  const query = normalize(filters.query);
  const tag = normalize(filters.tag);
  const platform = normalize(filters.platform);
  const rank = normalize(filters.rank);
  return `${query}|${tag}|${platform}|${rank}`;
};

export const filterModules = (
  modules: readonly NormalizedModule[],
  filters: ModuleFilters,
  options: FilterOptions = {},
): NormalizedModule[] => {
  const { cache, cacheKey } = options;
  const key = cacheKey ?? createFilterCacheKey(filters);

  if (cache) {
    const cached = cache.get(key);
    if (cached) {
      return cached;
    }
  }

  const queryValue = normalize(filters.query);
  const queryParts = queryValue ? queryValue.split(/\s+/).filter(Boolean) : [];
  const tagValue = normalize(filters.tag);
  const platformValue = normalize(filters.platform);
  const rankValue = normalize(filters.rank);

  const results: NormalizedModule[] = [];

  for (let idx = 0; idx < modules.length; idx += 1) {
    const mod = modules[idx];

    if (rankValue && mod.rank !== rankValue) {
      continue;
    }

    if (platformValue && mod.platformLower !== platformValue) {
      continue;
    }

    if (tagValue && !mod.tagCache.includes(tagValue)) {
      continue;
    }

    if (queryParts.length) {
      let matches = true;
      for (let partIdx = 0; partIdx < queryParts.length; partIdx += 1) {
        const part = queryParts[partIdx];
        if (
          mod.lowerName.indexOf(part) === -1 &&
          mod.lowerDescription.indexOf(part) === -1
        ) {
          matches = false;
          break;
        }
      }
      if (!matches) {
        continue;
      }
    }

    results.push(mod);
  }

  if (cache) {
    cache.set(key, results);
  }

  return results;
};
