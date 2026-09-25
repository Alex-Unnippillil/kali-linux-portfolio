import React, { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import EmbedFrame from '../../EmbedFrame';
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

type NormalisedUrl = {
  url: string;
  didFallback: boolean;
};

const normaliseUrl = (value: string): NormalisedUrl => {
  const trimmed = value.trim();
  if (!trimmed) {
    return { url: DEFAULT_URL, didFallback: true };
  }

  const base = typeof window !== 'undefined' ? window.location.href : DEFAULT_URL;

  try {
    const protocolMatch = trimmed.match(/^([a-z][a-z0-9+.-]*):/i);
    if (protocolMatch) {
      const scheme = protocolMatch[1].toLowerCase();
      if (scheme === 'http' || scheme === 'https') {
        const url = new URL(trimmed, base);
        return { url: url.toString(), didFallback: false };
      }
      return { url: DEFAULT_URL, didFallback: true };
    }

    if (/^\/\//.test(trimmed)) {
      const url = new URL(`https:${trimmed}`);
      return { url: url.toString(), didFallback: false };
    }

    const candidate = new URL(`https://${trimmed}`);
    return { url: candidate.toString(), didFallback: false };
  } catch {
    return { url: DEFAULT_URL, didFallback: true };
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

const FIREFOX_ALLOWED_ORIGINS = [
  'https://www.kali.org',
  'https://www.offsec.com',
  'https://www.exploit-db.com',
  'https://forums.kali.org',
  'https://developer.mozilla.org',
  'https://en.wikipedia.org',
  'https://www.google.com',
  'https://example.com',
];

const Firefox: React.FC = () => {
  const initialUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return DEFAULT_URL;
    }
    try {
      const start = sessionStorage.getItem(START_URL_KEY);
      if (start) {
        sessionStorage.removeItem(START_URL_KEY);
        const { url } = normaliseUrl(start);
        localStorage.setItem(STORAGE_KEY, url);
        return url;
      }
      const last = localStorage.getItem(STORAGE_KEY);
      return last ? normaliseUrl(last).url : DEFAULT_URL;
    } catch {
      return DEFAULT_URL;
    }
  }, []);

  const [address, setAddress] = useState(initialUrl);
  const [inputValue, setInputValue] = useState(initialUrl);
  const [simulation, setSimulation] = useState(() => getSimulation(initialUrl));
  const [isLoading, setIsLoading] = useState(() => !getSimulation(initialUrl));
  const [correction, setCorrection] = useState<{ originalInput: string } | null>(null);
  const [shouldHighlightCorrection, setShouldHighlightCorrection] = useState(false);
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
    const { url, didFallback } = normaliseUrl(value);
    setAddress(url);
    setInputValue(url);
    const nextSimulation = getSimulation(url);
    setSimulation(nextSimulation);
    setIsLoading(didFallback ? false : !nextSimulation);

    if (didFallback) {
      setCorrection({ originalInput: value });
      setShouldHighlightCorrection(true);
    } else {
      setCorrection(null);
      setShouldHighlightCorrection(false);
    }

    try {
      localStorage.setItem(STORAGE_KEY, url);
    } catch {
      /* ignore persistence errors */
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    if (shouldHighlightCorrection) {
      setShouldHighlightCorrection(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    updateAddress(inputValue);
  };

  const handleQuickFill = (url: string) => {
    setInputValue(url);
    setCorrection(null);
    setShouldHighlightCorrection(false);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  const restoreLastInput = () => {
    if (!correction) {
      return;
    }
    setInputValue(correction.originalInput);
    setShouldHighlightCorrection(true);
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col bg-[var(--kali-surface)] text-[color:var(--kali-text)]">
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-3 border-b border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <label htmlFor="firefox-address" className="sr-only">
          Address
        </label>
        <div className="flex w-full flex-col gap-2 sm:flex-1">
          <div
            className={`flex min-w-0 items-center gap-3 rounded-md border bg-[var(--kali-control-surface)] px-3 py-2 shadow-[inset_0_1px_0_color-mix(in_srgb,var(--kali-text)_12%,transparent)] transition ${
              shouldHighlightCorrection
                ? 'border-[color:color-mix(in_srgb,var(--color-warning)_55%,transparent)] ring-1 ring-[color:color-mix(in_srgb,var(--color-warning)_65%,transparent)]'
                : 'border-[color:var(--kali-border)]'
            } focus-within:border-[color:var(--color-primary)] focus-within:ring-1 focus-within:ring-[color:var(--color-primary)]`}
          >
            <input
              id="firefox-address"
              ref={inputRef}
              value={inputValue}
              onChange={handleInputChange}
              placeholder="Enter a URL"
              aria-label="Address bar"
              className="flex-1 bg-transparent text-sm text-[color:var(--kali-text)] placeholder:text-[color:color-mix(in_srgb,var(--kali-text)_60%,transparent)] focus:outline-none"
            />
            <div className="flex items-center" aria-live="polite">
              {isLoading ? (
                <span
                  className="flex h-5 w-5 items-center justify-center"
                  role="status"
                  aria-label="Loading address"
                >
                  <span className="h-4 w-4 animate-spin rounded-full border border-[color:var(--color-primary)] border-t-transparent" />
                </span>
              ) : correction ? (
                <span className="text-xs font-semibold text-[color:var(--color-warning)]">Corrected</span>
              ) : (
                <span className="text-xs font-medium text-[color:var(--color-primary)]">Ready</span>
              )}
            </div>
          </div>
          {correction && (
            <div
              className="flex flex-col gap-2 rounded-md border border-[color:color-mix(in_srgb,var(--color-warning)_55%,transparent)] bg-[color-mix(in_srgb,var(--kali-overlay)_85%,var(--kali-bg))] px-3 py-2 text-xs text-[color:color-mix(in_srgb,var(--color-warning)_70%,var(--kali-text))]"
              role="status"
              aria-live="polite"
            >
              <p>
                We redirected you to the Kali Docs homepage (
                <a
                  href={DEFAULT_URL}
                  className="text-[color:var(--color-warning)] underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-warning)]"
                >
                  {DEFAULT_URL}
                </a>
                ) because
                {correction.originalInput.trim() ? (
                  <>
                    {' '}
                    “
                    <span className="break-all font-semibold text-[color:var(--kali-text)]">
                      {correction.originalInput.trim()}
                    </span>
                    ”
                  </>
                ) : (
                  ' the address was empty'
                )}{' '}
                didn’t look like a safe URL.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={restoreLastInput}
                  className="inline-flex items-center gap-1 rounded border border-[color:color-mix(in_srgb,var(--color-warning)_45%,transparent)] bg-[var(--kali-control-surface)] px-2 py-1 text-[color:var(--kali-text)] transition hover:border-[color:var(--color-warning)] hover:text-[color:var(--color-warning)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-warning)]"
                >
                  Restore &amp; edit
                </button>
                <span className="text-[color:color-mix(in_srgb,var(--kali-text)_70%,var(--kali-bg))]">
                  Update the address above and press Go to try again.
                </span>
              </div>
            </div>
          )}
          <div className="flex items-center justify-between gap-2 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_86%,var(--kali-bg))] sm:justify-start">
            <div className="flex items-center gap-1 overflow-x-auto">
              {BOOKMARKS.slice(0, 5).map((bookmark) => (
                <button
                  key={`quick-${bookmark.url}`}
                  type="button"
                  onClick={() => handleQuickFill(bookmark.url)}
                  className="rounded-md border border-transparent bg-[var(--kali-overlay)] p-1 transition hover:border-[color:var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--kali-overlay)_85%,var(--kali-bg))] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
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
            <kbd className="hidden rounded border border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-text)_94%,var(--kali-bg))] sm:block">
              Ctrl/⌘ + L
            </kbd>
          </div>
        </div>
        <button
          type="submit"
          className="h-10 rounded-md bg-[color:var(--color-primary)] px-4 text-sm font-semibold text-[color:var(--color-inverse)] shadow-[0_12px_32px_-12px_var(--kali-blue-glow)] transition hover:brightness-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
        >
          Go
        </button>
      </form>
      <nav className="border-b border-[color:var(--kali-border)] bg-[var(--kali-overlay)] px-2 py-2 text-xs sm:px-4" aria-label="Pinned sites">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {BOOKMARKS.map((bookmark) => {
            const normalizedBookmark = normaliseUrl(bookmark.url).url;
            const isActive = address === normalizedBookmark;
            return (
              <button
                key={bookmark.url}
                type="button"
                onClick={() => updateAddress(bookmark.url)}
                className={`rounded-full px-3 py-1 font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)] ${
                  isActive
                    ? 'bg-[color:var(--color-primary)] text-[color:var(--color-inverse)] shadow-[inset_0_1px_0_color-mix(in_srgb,var(--kali-text)_16%,transparent)] hover:brightness-110'
                    : 'bg-[var(--kali-overlay)] text-[color:color-mix(in_srgb,var(--kali-text)_88%,var(--kali-bg))] hover:bg-[color-mix(in_srgb,var(--kali-overlay)_85%,var(--kali-bg))]'
                }`}
                aria-current={isActive ? 'page' : undefined}
              >
                {bookmark.label}
              </button>
            );
          })}
        </div>
      </nav>
      <div className="relative flex-1 min-h-0 bg-[var(--kali-bg)]">
        {!simulation && (
          <aside className="pointer-events-auto absolute left-3 top-3 z-10 max-w-sm rounded-lg border border-[color:color-mix(in_srgb,var(--color-primary)_70%,transparent)] bg-[color-mix(in_srgb,var(--kali-bg)_94%,transparent)] p-4 text-xs text-[color:color-mix(in_srgb,var(--kali-text)_92%,var(--kali-bg))] shadow-[0_24px_60px_-24px_var(--kali-blue-glow)] backdrop-blur">
            <h2 className="text-sm font-semibold text-[color:var(--color-primary)]">Sandboxed live preview</h2>
            <p className="mt-2 text-[color:color-mix(in_srgb,var(--kali-text)_88%,var(--kali-bg))]">
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
                  className="flex items-center gap-2 rounded border border-[color:var(--kali-border)] bg-[color-mix(in_srgb,var(--kali-overlay)_90%,var(--kali-bg))] px-2 py-1 text-[color:color-mix(in_srgb,var(--kali-text)_92%,var(--kali-bg))] transition hover:border-[color:var(--color-primary)] hover:text-[color:var(--kali-text)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--color-primary)]"
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
          <EmbedFrame
            key={address}
            title="Firefox"
            src={address}
            className="h-full w-full border-0"
            containerClassName="relative h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowedOrigins={FIREFOX_ALLOWED_ORIGINS}
            loadingLabel="Loading site preview…"
            onLoad={() => setIsLoading(false)}
            onError={() => setIsLoading(false)}
            onBlocked={() => setIsLoading(false)}
          />
        )}
      </div>
    </div>
  );
};

export const displayFirefox = () => <Firefox />;

export default Firefox;
