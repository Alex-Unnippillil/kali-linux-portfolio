import { get, set, del } from 'idb-keyval';
import { isBrowser } from '../../utils/isBrowser';

export interface FileMetadata {
  path: string;
  name: string;
  tags: string[];
  updatedAt: number;
}

export interface ProfileMetadata {
  files: Record<string, FileMetadata>;
  tagIndex: Record<string, string[]>;
  updatedAt: number;
}

type MetadataListener = (metadata: ProfileMetadata) => void;

interface BroadcastPayload {
  profileId: string;
  metadata: ProfileMetadata;
}

interface StoredProfileMetadata {
  files: Record<string, FileMetadata>;
  tagIndex: Record<string, string[]>;
  updatedAt: number;
}

const STORAGE_PREFIX = 'fs:metadata:';
const metadataChannel =
  isBrowser && 'BroadcastChannel' in self
    ? new BroadcastChannel('fs-metadata')
    : null;

const profileCache = new Map<string, ProfileMetadata>();
const loadingProfiles = new Map<string, Promise<ProfileMetadata>>();
const listenerMap = new Map<string, Set<MetadataListener>>();
const metadataSnapshots = new Map<string, ProfileMetadata>();

const now = () => Date.now();

const storageKey = (profileId: string): string => `${STORAGE_PREFIX}${profileId}`;

const cloneMetadata = (metadata: ProfileMetadata): ProfileMetadata =>
  structuredClone(metadata);

const createEmptyMetadata = (): ProfileMetadata => ({
  files: {},
  tagIndex: {},
  updatedAt: now(),
});

const normalizeTag = (tag: string): string => tag.trim().replace(/\s+/g, ' ').toLowerCase();

const dedupeAndSortTags = (tags: string[]): string[] => {
  const seen = new Set<string>();
  for (const tag of tags) {
    const normalized = normalizeTag(tag);
    if (normalized) seen.add(normalized);
  }
  return [...seen].sort();
};

const deriveName = (path: string, provided?: string): string => {
  if (provided?.trim()) return provided.trim();
  const segments = path.split('/').filter(Boolean);
  return segments[segments.length - 1] || path;
};

const ensureListenerSet = (profileId: string): Set<MetadataListener> => {
  const existing = listenerMap.get(profileId);
  if (existing) return existing;
  const created = new Set<MetadataListener>();
  listenerMap.set(profileId, created);
  return created;
};

const addToIndex = (
  index: Record<string, string[]>,
  tag: string,
  path: string,
): void => {
  const current = index[tag];
  if (current) {
    if (current.includes(path)) return;
    index[tag] = [...current, path].sort();
  } else {
    index[tag] = [path];
  }
};

const removeFromIndex = (
  index: Record<string, string[]>,
  tag: string,
  path: string,
): void => {
  const current = index[tag];
  if (!current) return;
  const next = current.filter((entry) => entry !== path);
  if (next.length) index[tag] = next;
  else delete index[tag];
};

const ensureFileEntry = (
  metadata: ProfileMetadata,
  path: string,
  name?: string,
): FileMetadata => {
  const existing = metadata.files[path];
  if (existing) {
    if (name && existing.name !== name) existing.name = deriveName(path, name);
    return existing;
  }
  const entry: FileMetadata = {
    path,
    name: deriveName(path, name),
    tags: [],
    updatedAt: now(),
  };
  metadata.files[path] = entry;
  return entry;
};

const sanitizeMetadata = (stored?: StoredProfileMetadata): ProfileMetadata => {
  if (!stored) return createEmptyMetadata();

  const sanitized: ProfileMetadata = {
    files: {},
    tagIndex: {},
    updatedAt: stored.updatedAt || now(),
  };

  for (const [path, file] of Object.entries(stored.files || {})) {
    const tags = dedupeAndSortTags(file.tags || []);
    const entry: FileMetadata = {
      path,
      name: deriveName(path, file.name),
      tags,
      updatedAt: file.updatedAt || stored.updatedAt || now(),
    };
    sanitized.files[path] = entry;
    for (const tag of tags) addToIndex(sanitized.tagIndex, tag, path);
  }

  // Rebuild tag index in case stored data drifted.
  for (const [tag, paths] of Object.entries(stored.tagIndex || {})) {
    for (const path of paths) {
      if (sanitized.files[path]) addToIndex(sanitized.tagIndex, tag, path);
    }
  }

  return sanitized;
};

const dispatchMetadata = (
  profileId: string,
  metadata: ProfileMetadata,
  broadcast: boolean,
): void => {
  const snapshot = cloneMetadata(metadata);
  metadataSnapshots.set(profileId, snapshot);
  const listeners = listenerMap.get(profileId);
  if (listeners) {
    for (const listener of listeners) listener(cloneMetadata(snapshot));
  }
  if (broadcast) metadataChannel?.postMessage({ profileId, metadata: snapshot });
};

const persistMetadata = async (
  profileId: string,
  metadata: ProfileMetadata,
  broadcast: boolean,
): Promise<void> => {
  profileCache.set(profileId, metadata);
  metadataSnapshots.set(profileId, cloneMetadata(metadata));
  await set(storageKey(profileId), cloneMetadata(metadata));
  dispatchMetadata(profileId, metadata, broadcast);
};

const ensureProfile = async (profileId: string): Promise<ProfileMetadata> => {
  if (profileCache.has(profileId)) return profileCache.get(profileId)!;

  let loader = loadingProfiles.get(profileId);
  if (!loader) {
    loader = (async () => {
      const stored = (await get<StoredProfileMetadata>(storageKey(profileId))) || undefined;
      const metadata = sanitizeMetadata(stored);
      profileCache.set(profileId, metadata);
      metadataSnapshots.set(profileId, cloneMetadata(metadata));
      return metadata;
    })();
    loadingProfiles.set(profileId, loader);
  }

  const metadata = await loader;
  return metadata;
};

metadataChannel?.addEventListener('message', (event: MessageEvent<BroadcastPayload>) => {
  const { profileId, metadata } = event.data;
  const sanitized = sanitizeMetadata(metadata);
  profileCache.set(profileId, sanitized);
  metadataSnapshots.set(profileId, cloneMetadata(sanitized));
  dispatchMetadata(profileId, sanitized, false);
});

export const getMetadataSnapshot = async (
  profileId: string,
): Promise<ProfileMetadata> => {
  const metadata = await ensureProfile(profileId);
  return cloneMetadata(metadata);
};

export const subscribeToMetadata = (
  profileId: string,
  listener: MetadataListener,
): (() => void) => {
  const listeners = ensureListenerSet(profileId);
  listeners.add(listener);
  ensureProfile(profileId).then(() => {
    const snapshot = metadataSnapshots.get(profileId);
    if (snapshot) listener(cloneMetadata(snapshot));
  });
  return () => {
    const set = listenerMap.get(profileId);
    set?.delete(listener);
    if (set && set.size === 0) listenerMap.delete(profileId);
  };
};

const updateFileTags = async (
  profileId: string,
  path: string,
  tags: string[],
  name?: string,
): Promise<FileMetadata> => {
  const metadata = await ensureProfile(profileId);
  const entry = ensureFileEntry(metadata, path, name);
  const normalized = dedupeAndSortTags(tags);
  const previous = new Set(entry.tags);
  entry.tags = normalized;
  entry.updatedAt = now();
  metadata.updatedAt = entry.updatedAt;

  for (const tag of previous) {
    if (!normalized.includes(tag)) removeFromIndex(metadata.tagIndex, tag, path);
  }
  for (const tag of normalized) addToIndex(metadata.tagIndex, tag, path);

  await persistMetadata(profileId, metadata, true);
  return cloneMetadata(entry);
};

export const addTagToFile = async (
  profileId: string,
  file: { path: string; name?: string },
  tag: string,
): Promise<FileMetadata> => {
  const normalizedTag = normalizeTag(tag);
  if (!normalizedTag) {
    const metadata = await ensureProfile(profileId);
    return cloneMetadata(ensureFileEntry(metadata, file.path, file.name));
  }
  const metadata = await ensureProfile(profileId);
  const entry = ensureFileEntry(metadata, file.path, file.name);
  if (entry.tags.includes(normalizedTag)) return cloneMetadata(entry);

  entry.tags = dedupeAndSortTags([...entry.tags, normalizedTag]);
  entry.updatedAt = now();
  metadata.updatedAt = entry.updatedAt;
  addToIndex(metadata.tagIndex, normalizedTag, entry.path);
  await persistMetadata(profileId, metadata, true);
  return cloneMetadata(entry);
};

export const removeTagFromFile = async (
  profileId: string,
  path: string,
  tag: string,
): Promise<FileMetadata | undefined> => {
  const metadata = await ensureProfile(profileId);
  const entry = metadata.files[path];
  if (!entry) return undefined;
  const normalizedTag = normalizeTag(tag);
  if (!normalizedTag || !entry.tags.includes(normalizedTag)) return cloneMetadata(entry);

  entry.tags = entry.tags.filter((t) => t !== normalizedTag);
  entry.updatedAt = now();
  metadata.updatedAt = entry.updatedAt;
  removeFromIndex(metadata.tagIndex, normalizedTag, path);
  await persistMetadata(profileId, metadata, true);
  return cloneMetadata(entry);
};

export const setFileTags = async (
  profileId: string,
  file: { path: string; name?: string },
  tags: string[],
): Promise<FileMetadata> => updateFileTags(profileId, file.path, tags, file.name);

export const getFileMetadata = async (
  profileId: string,
  path: string,
): Promise<FileMetadata | undefined> => {
  const metadata = await ensureProfile(profileId);
  const entry = metadata.files[path];
  return entry ? cloneMetadata(entry) : undefined;
};

export const listFilesForTag = async (
  profileId: string,
  tag: string,
): Promise<FileMetadata[]> => {
  const metadata = await ensureProfile(profileId);
  const paths = metadata.tagIndex[normalizeTag(tag)] || [];
  return paths
    .map((path) => metadata.files[path])
    .filter((entry): entry is FileMetadata => Boolean(entry))
    .map((entry) => cloneMetadata(entry));
};

export const listTags = async (
  profileId: string,
): Promise<{ tag: string; count: number }[]> => {
  const metadata = await ensureProfile(profileId);
  return Object.entries(metadata.tagIndex)
    .map(([tag, paths]) => ({ tag, count: paths.length }))
    .sort((a, b) => a.tag.localeCompare(b.tag));
};

export const clearProfileMetadata = async (profileId?: string): Promise<void> => {
  if (profileId) {
    profileCache.delete(profileId);
    metadataSnapshots.delete(profileId);
    listenerMap.delete(profileId);
    loadingProfiles.delete(profileId);
    await del(storageKey(profileId));
    dispatchMetadata(profileId, createEmptyMetadata(), false);
    return;
  }

  const keys = Array.from(profileCache.keys());
  profileCache.clear();
  metadataSnapshots.clear();
  listenerMap.clear();
  loadingProfiles.clear();
  for (const key of keys) {
    await del(storageKey(key));
  }
};

export const __internal = {
  normalizeTag,
  dedupeAndSortTags,
};

