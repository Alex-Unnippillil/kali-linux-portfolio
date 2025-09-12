'use client';

import { useEffect, useMemo, useState } from 'react';
import TabSkeleton from './components/TabSkeleton';
import usePersistentState from '../../hooks/usePersistentState';

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6 text-gray-700"
      fill="currentColor"
    >
      <path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z" />
    </svg>
  );
}

function ForwardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-6 h-6 text-gray-700"
      fill="currentColor"
    >
      <path d="M8.59 16.59 13.17 12 8.59 7.41 10 6l6 6-6 6z" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 text-gray-600"
      fill="currentColor"
    >
      <path d="M12 2a5 5 0 0 0-5 5v4H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2h-1V7a5 5 0 0 0-5-5zm3 9H9V7a3 3 0 0 1 6 0v4z" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 text-gray-600"
      fill="currentColor"
    >
      <path d="M16 1H4a2 2 0 0 0-2 2v14h2V3h12V1zm3 4H8a2 2 0 0 0-2 2v16h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm0 18H8V7h11v16z" />
    </svg>
  );
}

export default function ChromeApp() {
  const [history, setHistory] = usePersistentState<string[]>(
    'chrome-history',
    () => [],
  );
  const [index, setIndex] = useState(() =>
    history.length > 0 ? history.length - 1 : -1,
  );
  const url = history[index] || '';
  const [loading, setLoading] = useState(false);

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
  };

  const goBack = () => {
    if (index <= 0) return;
    setIndex(index - 1);
  };

  const goForward = () => {
    if (index >= history.length - 1) return;
    setIndex(index + 1);
  };

  useEffect(() => {
    if (url) {
      setLoading(true);
    }
  }, [url]);

  const favicon = useMemo(() => {
    if (!url) return '';
    try {
      const u = new URL(url);
      return `https://www.google.com/s2/favicons?domain=${u.hostname}&sz=16`;
    } catch {
      return '';
    }
  }, [url]);

  const hostname = useMemo(() => {
    try {
      return new URL(url).hostname;
    } catch {
      return url;
    }
  }, [url]);

  const copyUrl = () => {
    if (!url) return;
    try {
      navigator.clipboard.writeText(url);
    } catch {
      // ignore copy errors
    }
  };

  return (
    <div className="flex flex-col h-full">
      {loading && <TabSkeleton />}
      <div className="flex items-center space-x-2 bg-gray-100 p-1.5">
        <button
          type="button"
          onClick={goBack}
          disabled={index <= 0}
          className="disabled:opacity-50"
        >
          <BackIcon />
        </button>
        <button
          type="button"
          onClick={goForward}
          disabled={index >= history.length - 1}
          className="disabled:opacity-50"
        >
          <ForwardIcon />
        </button>
        {favicon && (
          <img loading="lazy" src={favicon} alt="favicon" width={16} height={16} />
        )}
        {url && (
          <div className="flex items-center space-x-1 bg-gray-200 rounded-full px-2 py-1 text-xs">
            <LockIcon />
            <span className="truncate max-w-[200px]">{hostname}</span>
            <button type="button" onClick={copyUrl} aria-label="Copy URL">
              <CopyIcon />
            </button>
          </div>
        )}
      </div>
      {url && (
        <iframe
          src={url}
          className="flex-1 w-full"
          title="chrome-content"
          onLoad={() => setLoading(false)}
        />
      )}
    </div>
  );
}

