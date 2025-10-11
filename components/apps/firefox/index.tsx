import React, { FormEvent, useMemo, useState } from 'react';

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

/**
 * Firefox renders a lightweight browser shell:
 * - Header row with the address bar form and navigation CTA.
 * - Optional bookmark strip with quick links.
 * - A sandboxed iframe that fills the remaining space.
 *
 * Persistence model:
 * - The last navigated URL is normalised and written to `localStorage` under `STORAGE_KEY`.
 * - Other apps can stage a one-time launch URL via `sessionStorage` (`START_URL_KEY`).
 *   When present, the staged value takes precedence, is persisted, and then cleared.
 */
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

  const updateAddress = (value: string) => {
    const url = normaliseUrl(value);
    setAddress(url);
    setInputValue(url);
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

  return (
    <div className="flex h-full flex-col bg-ub-cool-grey text-gray-100">
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-b border-gray-700 bg-gray-900 px-3 py-2"
      >
        <label htmlFor="firefox-address" className="sr-only">
          Address
        </label>
        <input
          id="firefox-address"
          type="url"
          aria-label="Address"
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          placeholder="Enter a URL"
          className="flex-1 rounded border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-400 focus:border-blue-500 focus:outline-none"
        />
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
      <div className="flex-1 bg-black">
        <iframe
          key={address}
          title="Firefox"
          src={address}
          className="h-full w-full border-0"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      </div>
    </div>
  );
};

export default Firefox;
