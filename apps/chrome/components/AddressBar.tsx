'use client';

import { useState, useEffect } from 'react';
import usePersistentState from '../../../hooks/usePersistentState';

interface Props {
  url: string;
  onNavigate: (url: string) => void;
}

export default function AddressBar({ url, onNavigate }: Props) {
  const [history, setHistory] = usePersistentState<string[]>(
    'chrome-history',
    () => []
  );
  const [index, setIndex] = useState(() =>
    history.length > 0 ? history.length - 1 : -1
  );
  const [input, setInput] = useState(url);
  const [bookmarks, setBookmarks] = usePersistentState<string[]>(
    'chrome-bookmarks',
    () => []
  );

  useEffect(() => {
    setInput(url);
  }, [url]);

  const navigate = (nextUrl: string) => {
    if (!nextUrl) return;
    let newHistory = history;
    if (index < history.length - 1) {
      newHistory = history.slice(0, index + 1);
    }
    if (newHistory[newHistory.length - 1] !== nextUrl) {
      newHistory = [...newHistory, nextUrl];
    }
    setHistory(newHistory);
    setIndex(newHistory.length - 1);
    onNavigate(nextUrl);
  };

  const go = () => navigate(input);

  const goBack = () => {
    if (index <= 0) return;
    const newIndex = index - 1;
    setIndex(newIndex);
    onNavigate(history[newIndex]);
  };

  const goForward = () => {
    if (index >= history.length - 1) return;
    const newIndex = index + 1;
    setIndex(newIndex);
    onNavigate(history[newIndex]);
  };

  const addBookmark = () => {
    if (url && !bookmarks.includes(url)) {
      setBookmarks([...bookmarks, url]);
    }
  };

  const navigateBookmark = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const targetUrl = e.target.value;
    if (targetUrl) {
      navigate(targetUrl);
      e.target.selectedIndex = 0;
    }
  };

  return (
    <div className="flex space-x-2 p-2 bg-gray-100">
      <button
        type="button"
        onClick={goBack}
        disabled={index <= 0}
        className="px-2 border rounded"
      >
        ◀
      </button>
      <button
        type="button"
        onClick={goForward}
        disabled={index >= history.length - 1}
        className="px-2 border rounded"
      >
        ▶
      </button>
      <input
        className="flex-1 border px-2 py-1 rounded"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && go()}
      />
      <button type="button" onClick={go} className="px-2 border rounded">
        Go
      </button>
      <button
        type="button"
        onClick={addBookmark}
        className="px-2 border rounded"
      >
        Bookmark
      </button>
      {bookmarks.length > 0 && (
        <select
          onChange={navigateBookmark}
          className="border px-2 py-1 rounded"
          defaultValue=""
        >
          <option value="" disabled>
            Bookmarks
          </option>
          {bookmarks.map((b) => (
            <option key={b} value={b}>
              {b}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

