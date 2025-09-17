"use client";

import { isBrowser } from "./isBrowser";

export type RecentItemType = "app" | "document";

export interface RecentItem {
  /** Unique identifier composed of the type prefix and target id. */
  id: string;
  /** Item category. */
  type: RecentItemType;
  /** Identifier that represents the underlying resource (app id, document id, etc.). */
  target: string;
  /** Display name for the item. */
  title: string;
  /** Optional secondary text such as a location or summary. */
  description?: string;
  /** Optional icon path. */
  icon?: string;
  /** App identifier that can reopen the item. */
  appId?: string;
  /** Timestamp in milliseconds when the item was last accessed. */
  timestamp: number;
  /** Arbitrary structured metadata used by host applications. */
  data?: Record<string, unknown>;
}

export interface RecentDocumentInput {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  appId?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export interface RecentAppInput {
  appId: string;
  title?: string;
  icon?: string;
  description?: string;
  timestamp?: number;
  data?: Record<string, unknown>;
}

export const RECENTS_STORAGE_KEY = "system-recents";
export const RECENTS_EVENT = "recents-change";
export const RECENTS_DOCUMENT_EVENT = "recents-open-document";

const MAX_ITEMS = 40;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const sanitizeItem = (value: unknown): RecentItem | null => {
  if (!isRecord(value)) return null;
  const { id, type, target, title, description, icon, appId, timestamp, data } =
    value as Record<string, unknown>;
  if (typeof id !== "string") return null;
  if (type !== "app" && type !== "document") return null;
  if (typeof target !== "string" || typeof title !== "string") return null;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) return null;

  const sanitized: RecentItem = {
    id,
    type,
    target,
    title,
    timestamp,
  };

  if (typeof description === "string" && description.trim()) {
    sanitized.description = description;
  }
  if (typeof icon === "string" && icon.trim()) {
    sanitized.icon = icon;
  }
  if (typeof appId === "string" && appId.trim()) {
    sanitized.appId = appId;
  }
  if (isRecord(data)) {
    sanitized.data = data;
  }

  return sanitized;
};

const readStorage = (): RecentItem[] => {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(RECENTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const items = parsed
      .map(sanitizeItem)
      .filter(Boolean) as RecentItem[];
    return items.sort((a, b) => b.timestamp - a.timestamp).slice(0, MAX_ITEMS);
  } catch {
    return [];
  }
};

const writeStorage = (items: RecentItem[]): void => {
  if (!isBrowser()) return;
  try {
    window.localStorage.setItem(
      RECENTS_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_ITEMS)),
    );
    window.dispatchEvent(new CustomEvent(RECENTS_EVENT));
  } catch {
    // ignore write errors
  }
};

const updateStorage = (updater: (items: RecentItem[]) => RecentItem[]): void => {
  if (!isBrowser()) return;
  const current = readStorage();
  const next = updater(current);
  writeStorage(next);
};

export const getRecents = (): RecentItem[] => readStorage();

export const clearRecents = (): void => {
  if (!isBrowser()) return;
  writeStorage([]);
};

export const removeRecent = (id: string): void => {
  if (!id) return;
  updateStorage((items) => items.filter((item) => item.id !== id));
};

const buildAppItem = ({
  appId,
  title,
  icon,
  description,
  timestamp,
  data,
}: RecentAppInput): RecentItem => ({
  id: `app:${appId}`,
  type: "app",
  target: appId,
  title: title || appId,
  icon,
  description,
  appId,
  timestamp: timestamp ?? Date.now(),
  data,
});

const buildDocumentItem = ({
  id,
  title,
  description,
  icon,
  appId,
  timestamp,
  data,
}: RecentDocumentInput): RecentItem => ({
  id: `document:${id}`,
  type: "document",
  target: id,
  title,
  description,
  icon,
  appId,
  timestamp: timestamp ?? Date.now(),
  data,
});

export const recordRecentApp = (input: RecentAppInput): void => {
  if (!input.appId) return;
  const item = buildAppItem(input);
  updateStorage((items) => {
    const filtered = items.filter((existing) => existing.id !== item.id);
    return [item, ...filtered].slice(0, MAX_ITEMS);
  });
};

export const recordRecentDocument = (input: RecentDocumentInput): void => {
  if (!input.id || !input.title) return;
  const item = buildDocumentItem(input);
  updateStorage((items) => {
    const filtered = items.filter((existing) => existing.id !== item.id);
    return [item, ...filtered].slice(0, MAX_ITEMS);
  });
};

export const touchRecent = (id: string): void => {
  if (!id) return;
  updateStorage((items) => {
    const idx = items.findIndex((item) => item.id === id);
    if (idx === -1) return items;
    const updated = { ...items[idx], timestamp: Date.now() };
    const filtered = items.filter((item, i) => i !== idx);
    return [updated, ...filtered];
  });
};

