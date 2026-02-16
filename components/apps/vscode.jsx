'use client';

import React, { useState, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import apps from '../../apps.config';

// Load the actual VSCode app lazily so no editor dependencies are required
const VsCode = dynamic(() => import('../../apps/vscode'), { ssr: false });

// Simple fuzzy match: returns true if query characters appear in order
function fuzzyMatch(text, query) {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let qi = 0;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) qi++;
    ti++;
  }
  return qi === q.length;
}

const files = ['README.md', 'CHANGELOG.md', 'package.json'];
const LAST_FILE_STORAGE_KEY = 'vscode:lastFile';
const RECENT_FILES_STORAGE_KEY = 'vscode:recentFiles';
const DEFAULT_FILE = 'README.md';

const getInitialFile = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_FILE;
  }

  return window.localStorage.getItem(LAST_FILE_STORAGE_KEY) || DEFAULT_FILE;
};

const getRecentFiles = () => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(RECENT_FILES_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((f) => files.includes(f)) : [];
  } catch {
    return [];
  }
};

export default function VsCodeWrapper({ openApp }) {
  const [visible, setVisible] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFile, setActiveFile] = useState(getInitialFile);
  const [recentFiles, setRecentFiles] = useState(getRecentFiles);
  const [activeIndex, setActiveIndex] = useState(0);

  const items = useMemo(() => {
    const appItems = apps.map((a) => ({ type: 'app', id: a.id, title: a.title }));
    const recentFileItems = recentFiles.map((fileName) => ({
      type: 'file',
      id: fileName,
      title: fileName,
    }));
    const remainingFileItems = files
      .filter((fileName) => !recentFiles.includes(fileName))
      .map((fileName) => ({ type: 'file', id: fileName, title: fileName }));
    const list = [
      ...recentFileItems,
      ...appItems,
      ...remainingFileItems,
    ];

    if (!query) return list;

    return list.filter((item) => fuzzyMatch(item.title, query));
  }, [query, recentFiles]);

  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setVisible((v) => !v);
      } else if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  useEffect(() => {
    setActiveIndex(0);
  }, [query, visible]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(items.length - 1, 0)));
  }, [items]);

  const updateRecentFiles = (fileName) => {
    setRecentFiles((current) => {
      const updated = [fileName, ...current.filter((item) => item !== fileName)].slice(
        0,
        5,
      );
      window.localStorage.setItem(RECENT_FILES_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  };

  const selectItem = (item) => {
    setVisible(false);
    setQuery('');

    if (item.type === 'app' && openApp) {
      openApp(item.id);
    } else if (item.type === 'file') {
      setActiveFile(item.id);
      window.localStorage.setItem(LAST_FILE_STORAGE_KEY, item.id);
      updateRecentFiles(item.id);
    }
  };

  const handleOverlayKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((current) => Math.min(current + 1, items.length - 1));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, 0));
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      const selected = items[activeIndex];
      if (selected) {
        selectItem(selected);
      }
      return;
    }

    if (event.key === 'Escape') {
      event.preventDefault();
      setVisible(false);
    }
  };

  return (
    <div className="relative h-full w-full">
      <VsCode
        file={activeFile}
        headerLeft={
          <button
            type="button"
            onClick={() => setVisible((current) => !current)}
            className="rounded border border-[color:var(--kali-panel-border)] px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-[color:var(--kali-text)] hover:bg-white/10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--color-accent)]"
          >
            Quick Open
          </button>
        }
      />
      {visible && (
        <div className="absolute inset-0 flex items-start justify-center bg-black/50 pt-24">
          <div className="bg-gray-800 text-white w-11/12 max-w-md rounded shadow-lg p-2">
            <input
              aria-label="Quick Open search"
              autoFocus
              className="mb-2 w-full rounded bg-gray-700 p-2 outline-none"
              placeholder="Search apps or files"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleOverlayKeyDown}
            />
            <ul className="max-h-60 overflow-y-auto">
              {items.map((item, index) => (
                <li key={`${item.type}-${item.id}`}>
                  <button
                    onClick={() => selectItem(item)}
                    className={`w-full rounded px-2 py-1 text-left hover:bg-gray-700 ${
                      index === activeIndex ? 'bg-gray-700' : ''
                    }`}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
              {items.length === 0 && (
                <li className="px-2 py-1 text-sm text-gray-400">No results</li>
              )}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

export const displayVsCode = (openApp) => <VsCodeWrapper openApp={openApp} />;
