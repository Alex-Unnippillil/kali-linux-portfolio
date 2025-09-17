'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent } from 'react';
import { BackIcon, BookmarkIcon, ForwardIcon, PlusIcon } from '../icons';
import useBrowserStorage from '../useBrowserStorage';

interface Props {
  url: string;
  onNavigate: (url: string) => void;
}

const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const normalizeUrl = (value: string) => value.trim();

export default function AddressBar({ url, onNavigate }: Props) {
  const [history, setHistory] = useBrowserStorage<string[]>(
    'history',
    () => [],
    isStringArray,
  );
  const [bookmarks, setBookmarks] = useBrowserStorage<string[]>(
    'bookmarks',
    () => [],
    isStringArray,
  );
  const [index, setIndex] = useState(() =>
    history.length > 0 ? history.length - 1 : -1,
  );
  const [input, setInput] = useState(url);

  useEffect(() => {
    setInput(url);
  }, [url]);

  useEffect(() => {
    setIndex((prev) => {
      if (history.length === 0) return -1;
      return prev > history.length - 1 ? history.length - 1 : prev;
    });
  }, [history]);

  const activeUrl = useMemo(() => history[index] ?? '', [history, index]);

  const updateHistory = (nextUrl: string) => {
    const target = normalizeUrl(nextUrl);
    if (!target) return;
    let nextHistory = history;
    if (index < history.length - 1) {
      nextHistory = history.slice(0, index + 1);
    }
    if (nextHistory[nextHistory.length - 1] !== target) {
      nextHistory = [...nextHistory, target];
    }
    setHistory(nextHistory);
    setIndex(nextHistory.length - 1);
    onNavigate(target);
  };

  const goBack = () => {
    if (index <= 0) return;
    const nextIndex = index - 1;
    setIndex(nextIndex);
    onNavigate(history[nextIndex]);
  };

  const goForward = () => {
    if (index >= history.length - 1) return;
    const nextIndex = index + 1;
    setIndex(nextIndex);
    onNavigate(history[nextIndex]);
  };

  const addBookmark = () => {
    const target = normalizeUrl(activeUrl || url);
    if (!target || bookmarks.includes(target)) return;
    setBookmarks([...bookmarks, target]);
  };

  const navigateBookmark = (event: ChangeEvent<HTMLSelectElement>) => {
    const target = event.target.value;
    if (!target) return;
    updateHistory(target);
    event.target.selectedIndex = 0;
  };

  const go = () => updateHistory(input);

  return (
    <div className="flex items-center gap-2 bg-gray-100 p-2">
      <button
        type="button"
        onClick={goBack}
        disabled={index <= 0}
        className="rounded border bg-white p-1 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        aria-label="Go back"
      >
        <BackIcon width={18} height={18} />
      </button>
      <button
        type="button"
        onClick={goForward}
        disabled={index >= history.length - 1}
        className="rounded border bg-white p-1 text-gray-700 transition hover:bg-gray-50 disabled:opacity-50"
        aria-label="Go forward"
      >
        <ForwardIcon width={18} height={18} />
      </button>
      <input
        className="flex-1 rounded border px-3 py-1 text-sm shadow-inner focus:outline-none focus:ring"
        value={input}
        onChange={(event) => setInput(event.target.value)}
        onKeyDown={(event) => event.key === 'Enter' && go()}
        placeholder="Search or enter address"
        aria-label="Address bar"
      />
      <button
        type="button"
        onClick={go}
        className="flex items-center gap-1 rounded border bg-white px-2 py-1 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
      >
        <PlusIcon width={16} height={16} />
        Open
      </button>
      <button
        type="button"
        onClick={addBookmark}
        className="flex items-center gap-1 rounded border bg-white px-2 py-1 text-sm text-gray-700 transition hover:bg-gray-50"
      >
        <BookmarkIcon width={16} height={16} />
        Save
      </button>
      {bookmarks.length > 0 && (
        <label className="sr-only" htmlFor="browser-bookmarks">
          Open bookmark
        </label>
      )}
      {bookmarks.length > 0 && (
        <select
          id="browser-bookmarks"
          onChange={navigateBookmark}
          className="rounded border px-2 py-1 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Bookmarks
          </option>
          {bookmarks.map((bookmark) => (
            <option key={bookmark} value={bookmark}>
              {bookmark}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

