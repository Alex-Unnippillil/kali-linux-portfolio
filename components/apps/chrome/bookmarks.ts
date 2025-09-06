"use client";

import { isBrowser } from '@/utils/env';
import { get, set } from 'idb-keyval';

export interface Bookmark {
  url: string;
  title?: string;
}

const BOOKMARKS_KEY = 'chrome-bookmarks';
const FAVICON_PREFIX = 'chrome-favicon:';

export const getBookmarks = async (): Promise<Bookmark[]> =>
  (!isBrowser()
    ? []
    : (await get<Bookmark[]>(BOOKMARKS_KEY)) || []);

export const saveBookmarks = async (bookmarks: Bookmark[]): Promise<void> => {
  if (!isBrowser()) return;
  await set(BOOKMARKS_KEY, bookmarks);
};

export const addBookmark = async (bookmark: Bookmark): Promise<void> => {
  const bookmarks = await getBookmarks();
  if (!isBrowser()) return;
  if (!bookmarks.some((b) => b.url === bookmark.url)) {
    bookmarks.push(bookmark);
    await saveBookmarks(bookmarks);
  }
};

export const removeBookmark = async (url: string): Promise<void> => {
  const bookmarks = await getBookmarks();
  if (!isBrowser()) return;
  await saveBookmarks(bookmarks.filter((b) => b.url !== url));
};

export const exportBookmarks = async (): Promise<Blob> => {
  const data = JSON.stringify(await getBookmarks(), null, 2);
  return new Blob([data], { type: 'application/json' });
};

export const importBookmarks = async (json: string): Promise<void> => {
  try {
    const parsed = JSON.parse(json) as Bookmark[];
    if (Array.isArray(parsed)) {
      await saveBookmarks(parsed);
    }
  } catch {
    /* ignore */
  }
};

export const getCachedFavicon = async (origin: string): Promise<string | undefined> =>
  !isBrowser()
    ? undefined
    : (await get<string>(FAVICON_PREFIX + origin)) || undefined;

export const cacheFavicon = async (origin: string, dataUrl: string): Promise<void> => {
  if (!isBrowser()) return;
  await set(FAVICON_PREFIX + origin, dataUrl);
};
