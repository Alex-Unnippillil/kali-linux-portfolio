import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { FirefoxSimulationView, SIMULATIONS, toSimulationKey } from './simulations';

const DEFAULT_URL = 'https://www.kali.org/docs/';
const STORAGE_KEY = 'firefox:last-url';
const START_URL_KEY = 'firefox:start-url';

const BOOKMARKS = [
  { label: 'OffSec', url: 'https://www.offsec.com/?utm_source=kali&utm_medium=os&utm_campaign=firefox' },
  { label: 'Kali Linux', url: 'https://www.kali.org/' },
  { label: 'Kali Tools', url: 'https://www.kali.org/tools/' },
  { label: 'Kali Docs', url: 'https://www.kali.org/docs/' },
  { label: 'Kali Forums', url: 'https://forums.kali.org/' },
  { label: 'Kali NetHunter', url: 'https://www.kali.org/get-kali/#kali-platforms' },
  { label: 'Exploit-DB', url: 'https://www.exploit-db.com/' },
  { label: 'GoogleHackingDB', url: 'https://www.exploit-db.com/google-hacking-database' },
];

const normaliseUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) {
    return DEFAULT_URL;
  }
  try {
    const hasProtocol = /^(https?:)?\/\//i.test(trimmed);
    if (hasProtocol) {
      const url = new URL(trimmed, window.location.href);
      if (url.protocol === 'http:' || url.protocol === 'https:') {
        return url.toString();
      }
      return DEFAULT_URL;
    }
    const candidate = new URL(`https://${trimmed}`);
    return candidate.toString();
  } catch {
    return DEFAULT_URL;
  }
};

const getSimulation = (value: string) => {
  const key = toSimulationKey(value);
  if (!key) {
    return null;
  }
  return SIMULATIONS[key] ?? null;
};

const getFaviconUrl = (url: string) => {
  try {
    const { hostname } = new URL(url);
    return `https://icons.duckduckgo.com/ip3/${hostname}.ico`;
  } catch {
    return 'https://icons.duckduckgo.com/ip3/kali.org.ico';
  }
};

const Firefox: React.FC = () => {
  const initialUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_URL;
    }
    try {
      const start = sessionStorage.getItem(START_URL_KEY);
      if (start) {
        sessionStorage.removeItem(START_URL_KEY);
        const url = normaliseUrl(start);
        localStorage.setItem(STORAGE_KEY, url);
        return url;
      }
      const last = localStorage.getItem(STORAGE_KEY);
      return last ? normaliseUrl(last) : DEFAULT_URL;
    } catch {
      return DEFAULT_URL;
    }
  }, []);

  const [address, setAddress] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);
  const [simulation, setSimulation] = useState(() => getSimulation(initialUrl));
  const [isLoading, setIsLoading] = useState(() => !getSimulation(initialUrl));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'l') {
        event.preventDefault();
        const node = inputRef.current;
        if (node) {
          node.focus();
          node.select();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const updateAddress = (value: string) => {
    const url = normaliseUrl(value);
    setAddress(url);
    setInputValue(url);
    const nextSimulation = getSimulation(url);
    setSimulation(nextSimulation);
    setIsLoading(!nextSimulation);
    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch {
      /* ignore persistence errors */
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAddress(inputValue);
  };

  const handleQuickFill = (url: string) => {
    setInputValue(url);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-gray-100">
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-center gap-2 border-b border-gray-700 bg-gray-900 px-3 py-2"
      >
        <label htmlFor="firefox-address" className="sr-only">
          Address
        </label>
        <input
          id="firefox-address"
          ref={inputRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Enter a URL"
          className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-1 sm:flex">
            {BOOKMARKS.slice(0, 5).map((bookmark) => (
              <button
                key={`quick-${bookmark.url}`}
                type="button"
                onClick={() => handleQuickFill(bookmark.url)}
                className="rounded border border-transparent bg-gray-800/80 p-1 transition hover:border-blue-400 hover:bg-gray-700"
                aria-label={`Fill address with ${bookmark.label}`}
              >
                <img
                  src={getFaviconUrl(bookmark.url)}
                  alt=""
                  className="h-4 w-4"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
          <kbd className="hidden rounded border border-gray-700 bg-gray-800 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-gray-300 sm:block">
            Ctrl/⌘ + L
          </kbd>
          <div className="flex items-center justify-center">
            {isLoading ? (
              <span
                className="flex h-5 w-5 items-center justify-center"
                role="status"
                aria-label="Loading address"
              >
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
              </span>
            ) : (
              <span className="text-xs text-gray-400">Ready</span>
            )}
          </div>
        </div>
        <button
          type="submit"
          className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          Go
        </button>
      </form>
      <nav className="flex flex-wrap gap-1 border-b border-gray-800 bg-gray-900 px-3 py-2 text-xs">
        {BOOKMARKS.map((bookmark) => (
          <button
            key={bookmark.url}
            type="button"
            onClick={() => updateAddress(bookmark.url)}
            className="rounded bg-gray-800 px-3 py-1 font-medium text-gray-200 transition hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400"
          >
            {bookmark.label}
          </button>
        ))}
      </nav>
      <div className="relative flex-1 bg-black">
        {!simulation && (
          <aside className="pointer-events-auto absolute left-3 top-3 z-10 max-w-sm rounded-lg border border-blue-500 bg-gray-900/95 p-4 text-xs text-gray-200 shadow-lg">
            <h2 className="text-sm font-semibold text-white">Sandboxed live preview</h2>
            <p className="mt-2 text-gray-300">
              This window loads external sites inside a sandboxed iframe for safety. Some sites may block embedding. Use the
              quick links below to open them directly in a new tab.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {BOOKMARKS.map((bookmark) => (
                <a
                  key={`fallback-${bookmark.url}`}
                  href={bookmark.url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 rounded border border-gray-700 bg-gray-800 px-2 py-1 text-gray-200 transition hover:border-blue-400 hover:text-white"
                >
                  <img src={getFaviconUrl(bookmark.url)} alt="" className="h-4 w-4" />
                  <span>{bookmark.label}</span>
                </a>
              ))}
            </div>
          </aside>
        )}
        {simulation ? (
          <FirefoxSimulationView simulation={simulation} />
        ) : (
          <iframe
            key={address}
            title="Firefox"
            src={address}
            className="h-full w-full border-0"
            sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
          />
        )}
      </div>
    </div>
  );
};

export const displayFirefox = () => <Firefox />;

export default Firefox;
