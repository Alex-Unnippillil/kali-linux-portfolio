import React, { FormEvent, useMemo, useState } from 'react';

const DEFAULT_URL = 'https://developer.mozilla.org/';
const STORAGE_KEY = 'firefox:last-url';
const START_URL_KEY = 'firefox:start-url';

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

export const displayFirefox = () => <Firefox />;

export default Firefox;
