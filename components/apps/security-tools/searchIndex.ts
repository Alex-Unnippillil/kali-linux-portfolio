import { useSyncExternalStore } from 'react';

import toolTags from '../../../data/tool-tags.json';
import { safeLocalStorage } from '../../../utils/safeStorage';

export type SourceId = 'suricata' | 'zeek' | 'sigma' | 'mitre' | 'yara';

export type SourceType = 'log' | 'rule' | 'technique';

export interface SourceMetadata {
  id: SourceId;
  label: string;
  type: SourceType;
  extension: string;
  tags: string[];
  /** ISO 8601 timestamp used for date range filtering */
  lastUpdated: string;
}

const SOURCE_METADATA: SourceMetadata[] = [
  {
    id: 'suricata',
    label: 'Suricata Alerts',
    type: 'log',
    extension: 'json',
    tags: ['suricata', 'ids', 'network', 'alert'],
    lastUpdated: '2024-01-01T00:00:00Z',
  },
  {
    id: 'zeek',
    label: 'Zeek HTTP Log',
    type: 'log',
    extension: 'json',
    tags: ['zeek', 'network', 'http', 'log'],
    lastUpdated: '2024-01-01T00:00:00Z',
  },
  {
    id: 'sigma',
    label: 'Sigma Rule',
    type: 'rule',
    extension: 'json',
    tags: ['sigma', 'detection', 'windows'],
    lastUpdated: '2023-11-15T00:00:00Z',
  },
  {
    id: 'mitre',
    label: 'MITRE ATT&CK Technique',
    type: 'technique',
    extension: 'json',
    tags: ['mitre', 'attack', 'tactic'],
    lastUpdated: '2024-02-20T00:00:00Z',
  },
  {
    id: 'yara',
    label: 'YARA Sample',
    type: 'rule',
    extension: 'txt',
    tags: ['yara', 'malware', 'detection'],
    lastUpdated: '2024-03-01T00:00:00Z',
  },
];

const SOURCE_BY_ID = new Map<SourceId, SourceMetadata>(
  SOURCE_METADATA.map((meta) => [meta.id, meta]),
);

const AVAILABLE_TYPES = Array.from(
  new Set(SOURCE_METADATA.map((meta) => meta.type)),
).sort();
const AVAILABLE_EXTENSIONS = Array.from(
  new Set(SOURCE_METADATA.map((meta) => meta.extension)),
).sort();

const metadataTagSet = new Set(
  SOURCE_METADATA.flatMap((meta) =>
    meta.tags.map((tag) => tag.toLowerCase()),
  ),
);
const toolTagSet = new Set(toolTags.map((tag) => tag.toLowerCase()));
const AVAILABLE_TAGS = Array.from(new Set([...metadataTagSet, ...toolTagSet]))
  .filter((tag) => tag.trim().length > 0)
  .sort((a, b) => a.localeCompare(b));

const TYPE_SET = new Set(AVAILABLE_TYPES);
const EXTENSION_SET = new Set(AVAILABLE_EXTENSIONS);
const TAG_SET = new Set(AVAILABLE_TAGS);

export const availableTypes = AVAILABLE_TYPES;
export const availableExtensions = AVAILABLE_EXTENSIONS;
export const availableTags = AVAILABLE_TAGS;

export interface DateRange {
  start?: string;
  end?: string;
}

export interface QueryOptions {
  types: string[];
  extensions: string[];
  tags: string[];
  dateRange: DateRange | null;
}

const STORAGE_KEY = 'security-tools:filters';

const DEFAULT_OPTIONS: QueryOptions = {
  types: [],
  extensions: [],
  tags: [],
  dateRange: null,
};

let currentOptions = loadFromStorage();
const listeners = new Set<() => void>();

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

function cloneOptions(options: QueryOptions): QueryOptions {
  return {
    types: [...options.types],
    extensions: [...options.extensions],
    tags: [...options.tags],
    dateRange: options.dateRange ? { ...options.dateRange } : null,
  };
}

function normalizeDate(value?: string): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  const timestamp = Date.parse(trimmed);
  if (Number.isNaN(timestamp)) return undefined;
  return trimmed;
}

function normalizeDateRange(range: DateRange | null | undefined): DateRange | null {
  if (!range) return null;
  const start = normalizeDate(range.start);
  const end = normalizeDate(range.end);
  if (!start && !end) return null;
  return { start, end };
}

function dedupe(values: string[]): string[] {
  return Array.from(new Set(values));
}

function sanitizeOptions(options: QueryOptions): QueryOptions {
  const normalizedRange = normalizeDateRange(options.dateRange);
  const normalizedTypes = dedupe(
    options.types.filter((type) => TYPE_SET.has(type)),
  );
  const normalizedExtensions = dedupe(
    options.extensions.filter((ext) => EXTENSION_SET.has(ext)),
  );
  const normalizedTags = dedupe(
    options.tags
      .map((tag) => tag.toLowerCase())
      .filter((tag) => TAG_SET.has(tag)),
  );
  return {
    types: normalizedTypes,
    extensions: normalizedExtensions,
    tags: normalizedTags,
    dateRange: normalizedRange,
  };
}

function loadFromStorage(): QueryOptions {
  if (!safeLocalStorage) {
    return cloneOptions(DEFAULT_OPTIONS);
  }
  try {
    const raw = safeLocalStorage.getItem(STORAGE_KEY);
    if (!raw) return cloneOptions(DEFAULT_OPTIONS);
    const parsed = JSON.parse(raw) as QueryOptions;
    return sanitizeOptions({
      types: parsed.types ?? [],
      extensions: parsed.extensions ?? [],
      tags: parsed.tags ?? [],
      dateRange: parsed.dateRange ?? null,
    });
  } catch (error) {
    console.warn('Failed to load security-tools filters', error);
    return cloneOptions(DEFAULT_OPTIONS);
  }
}

function persistOptions(options: QueryOptions) {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch (error) {
    console.warn('Failed to persist security-tools filters', error);
  }
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getSnapshot = () => currentOptions;
const getServerSnapshot = () => DEFAULT_OPTIONS;

export function useQueryOptions(): QueryOptions {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export function updateQueryOptions(
  updater: (prev: QueryOptions) => QueryOptions,
) {
  const updated = sanitizeOptions(updater(cloneOptions(currentOptions)));
  currentOptions = updated;
  persistOptions(updated);
  notify();
}

export function setQueryOptions(update: Partial<QueryOptions>) {
  updateQueryOptions((prev) => ({
    types: update.types ?? prev.types,
    extensions: update.extensions ?? prev.extensions,
    tags: update.tags ?? prev.tags,
    dateRange:
      update.dateRange === undefined
        ? prev.dateRange
        : normalizeDateRange(update.dateRange),
  }));
}

export function resetQueryOptions() {
  currentOptions = cloneOptions(DEFAULT_OPTIONS);
  persistOptions(currentOptions);
  notify();
}

function isWithinDateRange(meta: SourceMetadata, range: DateRange | null): boolean {
  if (!range) return true;
  const timestamp = Date.parse(meta.lastUpdated);
  if (Number.isNaN(timestamp)) return true;
  if (range.start) {
    const startTs = Date.parse(range.start);
    if (!Number.isNaN(startTs) && timestamp < startTs) return false;
  }
  if (range.end) {
    const endTs = Date.parse(range.end);
    if (!Number.isNaN(endTs) && timestamp > endTs + ONE_DAY_MS - 1) return false;
  }
  return true;
}

export function sourceMatches(
  meta: SourceMetadata | undefined,
  options: QueryOptions = currentOptions,
): boolean {
  if (!meta) return true;
  if (options.types.length && !options.types.includes(meta.type)) {
    return false;
  }
  if (options.extensions.length && !options.extensions.includes(meta.extension)) {
    return false;
  }
  if (options.tags.length) {
    const metaTags = new Set(meta.tags.map((tag) => tag.toLowerCase()));
    const allTagsMatch = options.tags.every((tag) => metaTags.has(tag));
    if (!allTagsMatch) return false;
  }
  if (!isWithinDateRange(meta, options.dateRange)) return false;
  return true;
}

export function getSourceMetadata(id: SourceId): SourceMetadata | undefined {
  return SOURCE_BY_ID.get(id);
}

export function getActiveSources(
  options: QueryOptions = currentOptions,
): SourceMetadata[] {
  return SOURCE_METADATA.filter((meta) => sourceMatches(meta, options));
}

export { SOURCE_METADATA as sourceMetadata };
