import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  addBookmark,
  removeBookmark,
  getBookmarks,
  exportBookmarks,
  importBookmarks,
  Bookmark,
} from './bookmarks';

interface AddressBarProps {
  value: string;
  onChange: (value: string) => void;
  onNavigate: (value: string) => void;
  onOpenNewTab: (value: string) => void;
  onOpenNewWindow: (value: string) => void;
  historyList?: string[];
}

interface Favorite {
  url: string;
  favicon: string;
}

const FAVORITE_DOMAINS = [
  'https://github.com',
  'https://google.com',
  'https://developer.mozilla.org',
];

const fetchSuggestions = async (term: string): Promise<string[]> => {
  const res = await fetch(
    `https://duckduckgo.com/ac/?q=${encodeURIComponent(term)}&type=list`,
  );
  const data = await res.json();
  return (data as Array<{ phrase: string }>).map((d) => d.phrase);
};

const AddressBar: React.FC<AddressBarProps> = ({
  value,
  onChange,
  onNavigate,
  onOpenNewTab,
  onOpenNewWindow,
  historyList,
}) => {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [index, setIndex] = useState(-1);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [history, setHistory] = useState<string[]>(historyList || []);
  const [menu, setMenu] = useState<{ x: number; y: number; url: string } | null>(
    null,
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const load = async () => {
      const favs = await Promise.all(
        FAVORITE_DOMAINS.map(async (url) => {
          try {
            const origin = new URL(url).origin;
            const favicon = `https://www.google.com/s2/favicons?domain=${origin}`;
            return { url, favicon };
          } catch {
            return { url, favicon: '' };
          }
        }),
      );
      setFavorites(favs);
      let hist: string[] = [];
      if (historyList) {
        hist = historyList;
      } else {
        try {
          const parsed = JSON.parse(localStorage.getItem('chrome-history') || '[]');
          if (Array.isArray(parsed)) hist = parsed;
        } catch {
          /* ignore */
        }
      }
      setHistory(hist);
      const bms = await getBookmarks();
      setBookmarks(bms);
      setSuggestions([
        ...favs.map((f) => f.url),
        ...hist,
        ...bms.map((b) => b.url),
      ]);
    };
    load();
  }, [historyList]);

  useEffect(() => {
    if (!value) {
      setSuggestions([
        ...favorites.map((f) => f.url),
        ...bookmarks.map((b) => b.url),
        ...history,
      ]);
      setIndex(-1);
      return;
    }
    const handle = setTimeout(async () => {
      try {
        const localMatches = [
          ...bookmarks.map((b) => b.url),
          ...history,
        ].filter((u) => u.includes(value));
        const sugs = await fetchSuggestions(value);
        setSuggestions([...new Set([...localMatches, ...sugs])]);
        setIndex(-1);
      } catch {
        setSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [value, favorites, bookmarks, history]);

  const addHistory = useCallback((url: string) => {
    setHistory((prev) => {
      const next = [url, ...prev.filter((u) => u !== url)].slice(0, 50);
      localStorage.setItem('chrome-history', JSON.stringify(next));
      return next;
    });
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setIndex((i) => Math.min(i + 1, suggestions.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setIndex((i) => Math.max(i - 1, -1));
      } else if (e.key === 'Enter') {
        const selected = suggestions[index];
        const url = selected || value;
        addHistory(url);
        onNavigate(url);
      }
    },
    [index, suggestions, value, onNavigate, addHistory],
  );

  const handleSuggestionClick = useCallback(
    (s: string) => {
      addHistory(s);
      onNavigate(s);
    },
    [onNavigate, addHistory],
  );

  const isBookmarked = bookmarks.some((b) => b.url === value);

  const toggleBookmark = useCallback(async () => {
    if (!value) return;
    if (isBookmarked) {
      await removeBookmark(value);
      setBookmarks((prev) => prev.filter((b) => b.url !== value));
    } else {
      await addBookmark({ url: value });
      setBookmarks((prev) => [...prev, { url: value }]);
    }
  }, [value, isBookmarked]);

  const handleExport = useCallback(async () => {
    const blob = await exportBookmarks();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'bookmarks.json';
    a.click();
  }, []);

  const handleImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    await importBookmarks(text);
    setBookmarks(await getBookmarks());
  }, []);

  const openContext = useCallback(
    (e: React.MouseEvent, url: string) => {
      e.preventDefault();
      setMenu({ x: e.clientX, y: e.clientY, url });
    },
    [],
  );

  const handleOpenTab = useCallback(() => {
    if (menu) {
      addHistory(menu.url);
      onOpenNewTab(menu.url);
    }
    setMenu(null);
  }, [menu, onOpenNewTab, addHistory]);

  const handleOpenWindow = useCallback(() => {
    if (menu) {
      addHistory(menu.url);
      onOpenNewWindow(menu.url);
    }
    setMenu(null);
  }, [menu, onOpenNewWindow, addHistory]);

  return (
    <div className="relative flex-grow">
      <div className="flex items-center">
        <input
          className="w-full px-2 py-0.5 text-black rounded"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          spellCheck={false}
        />
        <button
          aria-label="Bookmark"
          onClick={toggleBookmark}
          className="ml-1 text-yellow-500"
        >
          {isBookmarked ? '★' : '☆'}
        </button>
        <button onClick={handleExport} className="ml-1" aria-label="Export Bookmarks">
          ⤓
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="ml-1"
          aria-label="Import Bookmarks"
        >
          ⤒
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="hidden"
          onChange={handleImport}
        />
      </div>
      {suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 bg-white text-black mt-0.5 max-h-48 overflow-auto z-10 shadow">
          {suggestions.map((s, i) => {
            const fav = favorites.find((f) => f.url === s);
            return (
              <li
                key={s}
                className={`flex items-center px-2 py-1 cursor-pointer hover:bg-gray-200 ${i === index ? 'bg-gray-200' : ''}`}
                onMouseDown={() => handleSuggestionClick(s)}
                onContextMenu={(e) => openContext(e, s)}
              >
                {fav && fav.favicon && (
                  <img loading="lazy" src={fav.favicon} alt="" className="w-4 h-4 mr-2" />
                )}
                <span className="truncate">{s}</span>
              </li>
            );
          })}
        </ul>
      )}
      {menu && (
        <ul
          className="absolute bg-white text-black shadow border z-20"
          style={{ left: menu.x, top: menu.y }}
        >
          <li
            className="px-2 py-1 hover:bg-gray-200 cursor-pointer"
            onMouseDown={handleOpenTab}
          >
            Open in new tab
          </li>
          <li
            className="px-2 py-1 hover:bg-gray-200 cursor-pointer"
            onMouseDown={handleOpenWindow}
          >
            Open in new window
          </li>
        </ul>
      )}
    </div>
  );
};

export default AddressBar;
