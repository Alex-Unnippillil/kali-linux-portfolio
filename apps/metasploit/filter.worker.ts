/// <reference lib="webworker" />

import modules from './moduleData';
import type { NormalizedModule } from './moduleData';
import {
  createFilterCacheKey,
  filterModules,
  type ModuleFilters,
} from './filterModules';

interface FilterPayload {
  filters: ModuleFilters;
  key?: string;
}

interface FilterRequest {
  type: 'filter';
  payload: FilterPayload;
}

interface FilterResponse {
  type: 'result';
  payload: {
    modules: NormalizedModule[];
    key: string;
  };
}

const ctx: DedicatedWorkerGlobalScope = self as unknown as DedicatedWorkerGlobalScope;

const cache = new Map<string, NormalizedModule[]>();

ctx.onmessage = (event: MessageEvent<FilterRequest>) => {
  const { data } = event;
  if (!data || data.type !== 'filter') {
    return;
  }

  const { filters, key } = data.payload;
  const cacheKey = key ?? createFilterCacheKey(filters);

  const modulesResult = filterModules(modules, filters, {
    cache,
    cacheKey,
  });

  ctx.postMessage({
    type: 'result',
    payload: {
      modules: modulesResult,
      key: cacheKey,
    },
  } satisfies FilterResponse);
};

export {};
