import { z } from 'zod';

import { createLogger } from '../lib/logger';
import { safeLocalStorage } from './safeStorage';

const storageLogger = createLogger('desktop-storage');

export const DESKTOP_FOLDER_CONTENTS_KEY = 'desktop_folder_contents';
export const DESKTOP_WINDOW_SIZES_KEY = 'desktop_window_sizes';

const windowSizeSchema = z.object({
  width: z.coerce.number().finite().min(0),
  height: z.coerce.number().finite().min(0),
});

export type WindowSize = z.infer<typeof windowSizeSchema>;
export type WindowSizeMap = Record<string, WindowSize>;

const folderItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  icon: z.string().min(1).optional(),
});

export type DesktopFolderItem = z.infer<typeof folderItemSchema>;
export type DesktopFolderContents = Record<string, DesktopFolderItem[]>;

const rawFolderItemSchema = z.union([z.string().min(1), folderItemSchema]);

const parseWindowSizes = (value: unknown): { data: WindowSizeMap; changed: boolean } => {
  if (!value || typeof value !== 'object') {
    return { data: {}, changed: value !== undefined && value !== null };
  }

  const entries = Object.entries(value as Record<string, unknown>);
  let changed = false;
  const sanitized: WindowSizeMap = {};

  entries.forEach(([key, raw]) => {
    const parsed = windowSizeSchema.safeParse(raw);
    if (parsed.success) {
      sanitized[key] = parsed.data;
    } else {
      changed = true;
    }
  });

  if (entries.length !== Object.keys(sanitized).length) {
    changed = true;
  }

  return { data: sanitized, changed };
};

const parseFolderContents = (value: unknown): { data: DesktopFolderContents; changed: boolean } => {
  if (!value || typeof value !== 'object') {
    return { data: {}, changed: value !== undefined && value !== null };
  }

  const entries = Object.entries(value as Record<string, unknown>);
  let changed = false;
  const sanitized: DesktopFolderContents = {};

  entries.forEach(([folderId, raw]) => {
    if (!Array.isArray(raw)) {
      changed = true;
      return;
    }

    const normalized: DesktopFolderItem[] = [];
    raw.forEach(item => {
      const parsed = rawFolderItemSchema.safeParse(item);
      if (!parsed.success) {
        changed = true;
        return;
      }

      if (typeof parsed.data === 'string') {
        normalized.push({ id: parsed.data, title: parsed.data });
        if (parsed.data !== item) {
          changed = true;
        }
      } else {
        normalized.push(parsed.data);
      }
    });

    sanitized[folderId] = normalized;

    if (normalized.length !== raw.length) {
      changed = true;
    }
  });

  if (entries.length !== Object.keys(sanitized).length) {
    changed = true;
  }

  return { data: sanitized, changed };
};

const loadFromStorage = (key: string): unknown => {
  if (!safeLocalStorage) return undefined;
  const raw = safeLocalStorage.getItem(key);
  if (!raw) return undefined;
  try {
    return JSON.parse(raw);
  } catch (error) {
    storageLogger.error('Failed to parse desktop storage JSON', { key, error });
    safeLocalStorage.removeItem(key);
    return undefined;
  }
};

const persistToStorage = (key: string, value: unknown): void => {
  if (!safeLocalStorage) return;
  try {
    safeLocalStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    storageLogger.error('Failed to persist desktop storage value', { key, error });
  }
};

const sanitizeStoredValue = <T>({ key, parser }: { key: string; parser: (value: unknown) => { data: T; changed: boolean } }): T => {
  const stored = loadFromStorage(key);
  const { data, changed } = parser(stored);
  if (changed && safeLocalStorage) {
    storageLogger.info('Migrated desktop storage entry', {
      key,
      entryCount: Object.keys(data).length,
    });
    if (Object.keys(data).length === 0) {
      safeLocalStorage.removeItem(key);
    } else {
      persistToStorage(key, data);
    }
  }
  return data;
};

export const readWindowSizes = (storageKey: string = DESKTOP_WINDOW_SIZES_KEY): WindowSizeMap =>
  sanitizeStoredValue<WindowSizeMap>({ key: storageKey, parser: parseWindowSizes });

export const writeWindowSizes = (sizes: WindowSizeMap, storageKey: string = DESKTOP_WINDOW_SIZES_KEY): void => {
  if (!safeLocalStorage) return;
  const { data } = parseWindowSizes(sizes);
  persistToStorage(storageKey, data);
};

export const readDesktopFolderContents = (
  storageKey: string = DESKTOP_FOLDER_CONTENTS_KEY,
): DesktopFolderContents => sanitizeStoredValue<DesktopFolderContents>({ key: storageKey, parser: parseFolderContents });

export const writeDesktopFolderContents = (
  contents: DesktopFolderContents,
  storageKey: string = DESKTOP_FOLDER_CONTENTS_KEY,
): void => {
  if (!safeLocalStorage) return;
  const { data } = parseFolderContents(contents);
  if (Object.keys(data).length === 0) {
    safeLocalStorage.removeItem(storageKey);
    return;
  }
  persistToStorage(storageKey, data);
};

export const normalizeWindowSizes = (value: unknown): WindowSizeMap => parseWindowSizes(value).data;

export const normalizeDesktopFolderContents = (value: unknown): DesktopFolderContents =>
  parseFolderContents(value).data;
