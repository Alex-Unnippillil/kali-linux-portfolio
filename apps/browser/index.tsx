'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import AddressBar from './components/AddressBar';
import TabSkeleton from './components/TabSkeleton';
import { BrowserProvider, useBrowserContext } from './context';
import useBrowserStorage from './useBrowserStorage';
import { CopyIcon, IncognitoIcon, LockIcon } from './icons';
import { recordRecentVisit } from '../../src/recents';

type HistoryValidator = (value: unknown) => value is string[];

const isStringArray: HistoryValidator = (value): value is string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === 'string');

const detectIncognito = () => {
  if (typeof window === 'undefined') return false;
  const byName = /incognito/i.test(window.name || '');
  const searchParams = new URLSearchParams(window.location.search);
  const hashParams = window.location.hash.startsWith('#')
    ? new URLSearchParams(window.location.hash.slice(1))
    : null;

  if (byName) return true;
  if (searchParams.get('mode')?.toLowerCase() === 'incognito') return true;
  if (hashParams?.get('mode')?.toLowerCase() === 'incognito') return true;
  if (hashParams?.get('incognito') === '1') return true;
  return false;
};

const BrowserShell = () => {
  const { isIncognito } = useBrowserContext();
  const [history] = useBrowserStorage<string[]>('history', () => [], isStringArray);
  const [currentUrl, setCurrentUrl] = useState(() =>
    history.length > 0 ? history[history.length - 1] : '',
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!currentUrl && history.length > 0) {
      setCurrentUrl(history[history.length - 1]);
    }
  }, [history, currentUrl]);

  useEffect(() => {
    if (currentUrl) {
      setLoading(true);
    }
  }, [currentUrl]);

  useEffect(() => {
    if (!currentUrl) return;
    try {
      const parsed = new URL(currentUrl);
      recordRecentVisit({
        url: currentUrl,
        title: parsed.hostname,
        incognito: isIncognito,
      });
    } catch {
      recordRecentVisit({ url: currentUrl, title: currentUrl, incognito: isIncognito });
    }
  }, [currentUrl, isIncognito]);

  const handleNavigate = useCallback((value: string) => {
    const target = value.trim();
    setCurrentUrl(target);
  }, []);

  const favicon = useMemo(() => {
    if (!currentUrl) return '';
    try {
      const parsed = new URL(currentUrl);
      return `https://www.google.com/s2/favicons?domain=${parsed.hostname}&sz=16`;
    } catch {
      return '';
    }
  }, [currentUrl]);

  const hostname = useMemo(() => {
    if (!currentUrl) return '';
    try {
      return new URL(currentUrl).hostname;
    } catch {
      return currentUrl;
    }
  }, [currentUrl]);

  const copyUrl = useCallback(() => {
    if (!currentUrl) return;
    try {
      navigator.clipboard.writeText(currentUrl);
    } catch {
      /* ignore clipboard errors */
    }
  }, [currentUrl]);

  return (
    <div className="flex h-full flex-col bg-gray-50">
      <div className="space-y-2 border-b border-gray-200 bg-gray-100 p-2">
        <div className="flex items-center gap-2">
          {favicon ? (
            <img src={favicon} alt="" width={16} height={16} className="h-4 w-4" />
          ) : (
            <span className="h-4 w-4 rounded-full bg-gray-300" aria-hidden="true" />
          )}
          {currentUrl ? (
            <div className="flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs text-gray-700 shadow">
              <LockIcon width={14} height={14} />
              <span className="max-w-[220px] truncate" title={hostname}>
                {hostname}
              </span>
              <button
                type="button"
                onClick={copyUrl}
                aria-label="Copy current URL"
                className="rounded-full p-1 text-gray-500 transition hover:text-gray-700"
              >
                <CopyIcon width={14} height={14} />
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-500">Enter a URL to get started</span>
          )}
          {isIncognito && (
            <div className="ml-auto flex items-center gap-1 rounded-full bg-purple-100 px-3 py-1 text-xs font-medium text-purple-700">
              <IncognitoIcon width={14} height={14} />
              <span>Incognito</span>
            </div>
          )}
        </div>
        <AddressBar url={currentUrl} onNavigate={handleNavigate} />
      </div>
      <div className="relative flex-1 bg-white">
        {loading && <TabSkeleton />}
        {currentUrl ? (
          <iframe
            key={currentUrl}
            src={currentUrl}
            className="h-full w-full"
            title="browser-content"
            onLoad={() => setLoading(false)}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Start typing a site or search term above.
          </div>
        )}
      </div>
    </div>
  );
};

const BrowserApp = () => {
  const [isIncognito] = useState(detectIncognito);

  return (
    <BrowserProvider isIncognito={isIncognito}>
      <BrowserShell />
    </BrowserProvider>
  );
};

export default BrowserApp;
