import type { Module } from './types';

export interface SearchIndexEntry {
  module: Module;
  haystack: string;
}

export interface SearchFilters {
  query?: string;
  tag?: string;
  type?: string;
  platform?: string;
}

export interface FacetOptions {
  tags: string[];
  types: string[];
  platforms: string[];
}

export function buildSearchIndex(modules: Module[]): SearchIndexEntry[] {
  return modules.map((module) => ({
    module,
    haystack: [
      module.name,
      module.description,
      module.platform ?? '',
      ...(module.tags ?? []),
    ]
      .join(' ')
      .toLowerCase(),
  }));
}

export function computeFacets(modules: Module[]): FacetOptions {
  const tags = new Set<string>();
  const types = new Set<string>();
  const platforms = new Set<string>();

  modules.forEach((module) => {
    module.tags?.forEach((tag) => tags.add(tag));
    if (module.type) types.add(module.type);
    if (module.platform) platforms.add(module.platform);
  });

  const sort = (values: Set<string>) => Array.from(values).sort((a, b) => a.localeCompare(b));

  return {
    tags: sort(tags),
    types: sort(types),
    platforms: sort(platforms),
  };
}

export function filterModules(
  index: SearchIndexEntry[],
  filters: SearchFilters,
): Module[] {
  const query = filters.query?.trim().toLowerCase() ?? '';
  const tag = filters.tag ?? '';
  const type = filters.type ?? '';
  const platform = filters.platform ?? '';

  return index
    .filter(({ module, haystack }) => {
      if (type && module.type !== type) return false;
      if (platform && module.platform !== platform) return false;
      if (tag && !(module.tags ?? []).includes(tag)) return false;
      if (query && !haystack.includes(query)) return false;
      return true;
    })
    .map(({ module }) => module);
}
