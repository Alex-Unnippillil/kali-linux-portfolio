import { get, set, del } from 'idb-keyval';
import { isBrowser } from '../../utils/isBrowser';
import {
  type FileMetadata,
  type ProfileMetadata,
  getMetadataSnapshot,
  subscribeToMetadata,
  __internal as metadataInternal,
} from '../../modules/filesystem/metadata';

const { dedupeAndSortTags } = metadataInternal;

export interface SavedSearchDefinition {
  id: string;
  name: string;
  tags: string[];
  term?: string;
  createdAt: number;
  updatedAt: number;
}

export interface SavedSearchWithResults extends SavedSearchDefinition {
  results: FileMetadata[];
}

export interface EvaluationStats {
  scanned: number;
}

type SavedSearchListener = (searches: SavedSearchWithResults[]) => void;

interface StoredSavedSearches {
  definitions: SavedSearchDefinition[];
}

interface SavedSearchState {
  definitions: SavedSearchDefinition[];
  results: Map<string, FileMetadata[]>;
}

interface BroadcastPayload {
  profileId: string;
  definitions: SavedSearchDefinition[];
}

const STORAGE_PREFIX = 'fs:saved-searches:';
const savedSearchChannel =
  isBrowser && 'BroadcastChannel' in self
    ? new BroadcastChannel('fs-saved-searches')
    : null;

const savedSearchCache = new Map<string, SavedSearchState>();
const loadingStates = new Map<string, Promise<SavedSearchState>>();
const listenersMap = new Map<string, Set<SavedSearchListener>>();
const metadataSnapshots = new Map<string, ProfileMetadata>();
const metadataUnsubscribers = new Map<string, () => void>();

const storageKey = (profileId: string): string => `${STORAGE_PREFIX}${profileId}`;

const now = (): number => Date.now();

const generateId = (): string => {
  if (isBrowser && 'crypto' in self && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `search-${Math.random().toString(36).slice(2)}-${now()}`;
};

const cloneFile = (file: FileMetadata): FileMetadata => structuredClone(file);

const cloneSearch = (search: SavedSearchWithResults): SavedSearchWithResults => ({
  ...search,
  tags: [...search.tags],
  results: search.results.map(cloneFile),
});

const cloneDefinition = (definition: SavedSearchDefinition): SavedSearchDefinition => ({
  ...definition,
  tags: [...definition.tags],
});

const normalizeDefinition = (
  definition: SavedSearchDefinition,
): SavedSearchDefinition => {
  const normalizedTags = dedupeAndSortTags(definition.tags || []);
  const name = definition.name?.trim() || 'Smart Folder';
  const term = definition.term?.trim();
  return {
    ...definition,
    id: definition.id || generateId(),
    name,
    tags: normalizedTags,
    term: term || undefined,
    createdAt: definition.createdAt || now(),
    updatedAt: definition.updatedAt || definition.createdAt || now(),
  };
};

const ensureListenerSet = (profileId: string): Set<SavedSearchListener> => {
  const existing = listenersMap.get(profileId);
  if (existing) return existing;
  const created = new Set<SavedSearchListener>();
  listenersMap.set(profileId, created);
  return created;
};

const evaluateDefinition = (
  definition: SavedSearchDefinition,
  metadata: ProfileMetadata,
  options?: { collectStats?: boolean },
): { results: FileMetadata[]; stats?: EvaluationStats } => {
  const normalizedTags = dedupeAndSortTags(definition.tags || []);
  const term = definition.term?.trim().toLowerCase();
  let scanned = 0;

  const matchesTerm = (file: FileMetadata): boolean => {
    if (!term) return true;
    return (
      file.name.toLowerCase().includes(term) ||
      file.path.toLowerCase().includes(term)
    );
  };

  if (normalizedTags.length === 0) {
    const files = Object.values(metadata.files).filter(matchesTerm);
    scanned = options?.collectStats ? files.length : 0;
    return {
      results: files.map(cloneFile),
      stats: options?.collectStats ? { scanned } : undefined,
    };
  }

  const sortedTags = [...normalizedTags].sort((a, b) => {
    const lenA = metadata.tagIndex[a]?.length ?? Number.MAX_SAFE_INTEGER;
    const lenB = metadata.tagIndex[b]?.length ?? Number.MAX_SAFE_INTEGER;
    return lenA - lenB;
  });

  const primaryTag = sortedTags[0];
  const primaryCandidates = metadata.tagIndex[primaryTag] || [];
  scanned = options?.collectStats ? primaryCandidates.length : 0;

  let candidatePaths = [...primaryCandidates];
  for (let i = 1; i < sortedTags.length; i += 1) {
    if (!candidatePaths.length) break;
    const currentTag = sortedTags[i];
    const currentSet = new Set(metadata.tagIndex[currentTag] || []);
    candidatePaths = candidatePaths.filter((path) => currentSet.has(path));
  }

  const matches = candidatePaths
    .map((path) => metadata.files[path])
    .filter((file): file is FileMetadata => Boolean(file))
    .filter(matchesTerm)
    .map(cloneFile);

  return {
    results: matches,
    stats: options?.collectStats ? { scanned } : undefined,
  };
};

const recomputeResults = (profileId: string, state: SavedSearchState): void => {
  const metadata = metadataSnapshots.get(profileId);
  if (!metadata) return;
  const nextResults = new Map<string, FileMetadata[]>();
  for (const definition of state.definitions) {
    const evaluation = evaluateDefinition(definition, metadata);
    nextResults.set(definition.id, evaluation.results);
  }
  state.results = nextResults;
};

const notifyListeners = (profileId: string): void => {
  const state = savedSearchCache.get(profileId);
  if (!state) return;
  const listeners = listenersMap.get(profileId);
  if (!listeners || listeners.size === 0) return;
  const payload = state.definitions.map((definition) => ({
    ...cloneDefinition(definition),
    results: (state.results.get(definition.id) || []).map(cloneFile),
  }));
  for (const listener of listeners) listener(payload.map(cloneSearch));
};

const persistState = async (
  profileId: string,
  state: SavedSearchState,
  broadcast: boolean,
): Promise<void> => {
  const definitions = state.definitions.map(cloneDefinition);
  await set(storageKey(profileId), { definitions });
  if (broadcast)
    savedSearchChannel?.postMessage({ profileId, definitions } as BroadcastPayload);
  notifyListeners(profileId);
};

const ensureMetadataSubscription = (profileId: string): void => {
  if (metadataUnsubscribers.has(profileId)) return;
  const unsubscribe = subscribeToMetadata(profileId, (metadata) => {
    metadataSnapshots.set(profileId, metadata);
    const state = savedSearchCache.get(profileId);
    if (!state) return;
    recomputeResults(profileId, state);
    notifyListeners(profileId);
  });
  metadataUnsubscribers.set(profileId, unsubscribe);
};

const ensureState = async (profileId: string): Promise<SavedSearchState> => {
  if (savedSearchCache.has(profileId)) return savedSearchCache.get(profileId)!;

  let loader = loadingStates.get(profileId);
  if (!loader) {
    loader = (async () => {
      const stored = (await get<StoredSavedSearches>(storageKey(profileId))) || {
        definitions: [],
      };
      const definitions = (stored.definitions || []).map(normalizeDefinition);
      const state: SavedSearchState = {
        definitions,
        results: new Map(),
      };
      const metadata = await getMetadataSnapshot(profileId);
      metadataSnapshots.set(profileId, metadata);
      savedSearchCache.set(profileId, state);
      recomputeResults(profileId, state);
      ensureMetadataSubscription(profileId);
      return state;
    })();
    loadingStates.set(profileId, loader);
  }

  return loader;
};

savedSearchChannel?.addEventListener('message', (event: MessageEvent<BroadcastPayload>) => {
  const { profileId, definitions } = event.data;
  const state = savedSearchCache.get(profileId) || {
    definitions: [],
    results: new Map(),
  };
  state.definitions = definitions.map(normalizeDefinition);
  savedSearchCache.set(profileId, state);
  recomputeResults(profileId, state);
  notifyListeners(profileId);
});

export const getSavedSearchesSnapshot = async (
  profileId: string,
): Promise<SavedSearchWithResults[]> => {
  const state = await ensureState(profileId);
  return state.definitions.map((definition) => ({
    ...cloneDefinition(definition),
    results: (state.results.get(definition.id) || []).map(cloneFile),
  }));
};

export const subscribeToSavedSearches = (
  profileId: string,
  listener: SavedSearchListener,
): (() => void) => {
  const listeners = ensureListenerSet(profileId);
  listeners.add(listener);
  ensureState(profileId).then(() => {
    const state = savedSearchCache.get(profileId);
    if (!state) return;
    const payload = state.definitions.map((definition) => ({
      ...cloneDefinition(definition),
      results: (state.results.get(definition.id) || []).map(cloneFile),
    }));
    listener(payload.map(cloneSearch));
  });
  return () => {
    const set = listenersMap.get(profileId);
    set?.delete(listener);
    if (set && set.size === 0) listenersMap.delete(profileId);
  };
};

export const createSavedSearch = async (
  profileId: string,
  definition: Omit<SavedSearchDefinition, 'id' | 'createdAt' | 'updatedAt'> & {
    id?: string;
  },
): Promise<SavedSearchDefinition> => {
  const state = await ensureState(profileId);
  const normalized = normalizeDefinition({
    ...definition,
    id: definition.id || generateId(),
    createdAt: now(),
    updatedAt: now(),
  });
  state.definitions = [...state.definitions, normalized];
  recomputeResults(profileId, state);
  await persistState(profileId, state, true);
  return cloneDefinition(normalized);
};

export const deleteSavedSearch = async (
  profileId: string,
  searchId: string,
): Promise<void> => {
  const state = await ensureState(profileId);
  const nextDefinitions = state.definitions.filter((definition) => definition.id !== searchId);
  if (nextDefinitions.length === state.definitions.length) return;
  state.definitions = nextDefinitions;
  state.results.delete(searchId);
  await persistState(profileId, state, true);
};

export const evaluateSavedSearch = (
  definition: SavedSearchDefinition,
  metadata: ProfileMetadata,
  options?: { collectStats?: boolean },
): { results: FileMetadata[]; stats?: EvaluationStats } =>
  evaluateDefinition(definition, metadata, options);

export const clearSavedSearches = async (profileId?: string): Promise<void> => {
  if (profileId) {
    savedSearchCache.delete(profileId);
    loadingStates.delete(profileId);
    listenersMap.delete(profileId);
    metadataSnapshots.delete(profileId);
    metadataUnsubscribers.get(profileId)?.();
    metadataUnsubscribers.delete(profileId);
    await del(storageKey(profileId));
    return;
  }
  const profiles = Array.from(savedSearchCache.keys());
  savedSearchCache.clear();
  loadingStates.clear();
  listenersMap.clear();
  for (const [id, unsubscribe] of metadataUnsubscribers.entries()) unsubscribe();
  metadataUnsubscribers.clear();
  metadataSnapshots.clear();
  for (const id of profiles) {
    await del(storageKey(id));
  }
};

export const __internal = {
  normalizeDefinition,
  generateId,
};

