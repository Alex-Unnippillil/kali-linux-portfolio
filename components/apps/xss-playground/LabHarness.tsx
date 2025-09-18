'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const SANDBOX_FLAGS = ['allow-forms', 'allow-same-origin'];

const FALLBACKS = {
  reflected: 'No payload submitted.',
  stored: 'No entries stored yet.',
  dom: 'Template is waiting for DOM content.',
};

interface BuildState {
  reflected: string;
  dom: string;
  storedEntries: string[];
}

const buildMarkup = (base: string, state: BuildState) => {
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return base;
  }

  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(base, 'text/html');

    const reflectedValue = state.reflected.trim();
    const reflectedSafe = reflectedValue || FALLBACKS.reflected;

    const reflectedSafeNode = doc.querySelector('[data-slot="reflected-safe"]');
    if (reflectedSafeNode) {
      reflectedSafeNode.textContent = reflectedSafe;
    }

    const reflectedRawNode = doc.querySelector('[data-slot="reflected-raw"]');
    if (reflectedRawNode) {
      reflectedRawNode.innerHTML = reflectedValue || FALLBACKS.reflected;
    }

    const safeFeed = doc.querySelector('[data-feed="safe"]');
    if (safeFeed) {
      safeFeed.innerHTML = '';
      if (state.storedEntries.length === 0) {
        const placeholder = doc.createElement('li');
        placeholder.classList.add('placeholder');
        placeholder.textContent = FALLBACKS.stored;
        safeFeed.appendChild(placeholder);
      } else {
        state.storedEntries.forEach((entry, index) => {
          const item = doc.createElement('li');
          item.textContent = entry;
          item.setAttribute('data-entry-index', index.toString());
          safeFeed.appendChild(item);
        });
      }
    }

    const rawFeed = doc.querySelector('[data-feed="raw"]');
    if (rawFeed) {
      if (state.storedEntries.length === 0) {
        rawFeed.innerHTML = `<li class="placeholder">${FALLBACKS.stored}</li>`;
      } else {
        rawFeed.innerHTML = state.storedEntries
          .map((entry, index) => `<li data-entry-index="${index}">${entry}</li>`)
          .join('');
      }
    }

    const domValue = state.dom.trim() || FALLBACKS.dom;
    const domSafeNode = doc.querySelector('[data-slot="dom-safe"]');
    if (domSafeNode) {
      domSafeNode.textContent = domValue;
    }

    const domRawNode = doc.querySelector('[data-slot="dom-raw"]');
    if (domRawNode instanceof HTMLElement) {
      domRawNode.innerHTML = domValue;
      domRawNode.setAttribute('data-user-fragment', domValue);
    }

    return `<!DOCTYPE html>\n${doc.documentElement.outerHTML}`;
  } catch (error) {
    console.warn('Failed to build iframe markup', error);
    return base;
  }
};

const LabHarness: React.FC = () => {
  const pristineMarkupRef = useRef<string | null>(null);
  const skipNextUpdateRef = useRef(false);
  const [iframeMarkup, setIframeMarkup] = useState('');
  const [iframeKey, setIframeKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [reflectedPayload, setReflectedPayload] = useState('');
  const [storedDraft, setStoredDraft] = useState('');
  const [storedEntries, setStoredEntries] = useState<string[]>([]);
  const [domPayload, setDomPayload] = useState('');

  const fetchPristine = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/demo-data/xss/base.html');
      if (!response.ok) {
        throw new Error(`Failed to load demo markup (status ${response.status})`);
      }
      const html = await response.text();
      pristineMarkupRef.current = html;
      skipNextUpdateRef.current = true;
      setIframeMarkup(html);
      setIframeKey((key) => key + 1);
    } catch (err) {
      console.error(err);
      setError('Unable to load the sandboxed demo page.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchPristine();
  }, [fetchPristine]);

  useEffect(() => {
    if (!pristineMarkupRef.current) {
      return;
    }

    if (skipNextUpdateRef.current) {
      skipNextUpdateRef.current = false;
      return;
    }

    const nextMarkup = buildMarkup(pristineMarkupRef.current, {
      reflected: reflectedPayload,
      dom: domPayload,
      storedEntries,
    });
    setIframeMarkup(nextMarkup);
  }, [reflectedPayload, domPayload, storedEntries]);

  const handleReset = () => {
    if (!pristineMarkupRef.current) {
      return;
    }
    skipNextUpdateRef.current = true;
    setIframeMarkup(pristineMarkupRef.current);
    setIframeKey((key) => key + 1);
  };

  const handleClear = () => {
    setReflectedPayload('');
    setStoredDraft('');
    setStoredEntries([]);
    setDomPayload('');
  };

  const commitStoredPayload = () => {
    const value = storedDraft.trim();
    if (!value) {
      setStoredDraft('');
      return;
    }
    setStoredEntries((entries) => [...entries, value]);
    setStoredDraft('');
  };

  const sandboxAttribute = useMemo(() => SANDBOX_FLAGS.join(' '), []);

  return (
    <div className="flex h-full w-full flex-col bg-ub-cool-grey text-white">
      <div className="border-b border-black/40 bg-black/30 px-4 py-3">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Sandbox Controls</h2>
            <p className="text-xs text-gray-300">
              Payloads render inside a locked iframe with strict CSP. Reset reloads the document, while Clear wipes your inputs.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-sky-500"
            >
              Reset iframe
            </button>
            <button
              type="button"
              onClick={handleClear}
              className="rounded bg-red-600 px-3 py-1 text-sm font-medium hover:bg-red-500"
            >
              Clear payloads
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 flex-col overflow-hidden md:flex-row">
        <aside className="w-full max-w-full border-b border-black/40 bg-black/20 p-4 text-sm md:w-80 md:flex-shrink-0 md:border-b-0 md:border-r md:overflow-y-auto">
          <section className="space-y-2">
            <header>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Reflected input</h3>
              <p className="text-xs text-gray-400">Simulates a query parameter echoed back to the page.</p>
            </header>
            <input
              type="text"
              value={reflectedPayload}
              onChange={(event) => setReflectedPayload(event.target.value)}
              placeholder="<script>alert('xss')</script>"
              className="w-full rounded border border-white/10 bg-black/40 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-sky-400 focus:outline-none"
            />
          </section>

          <section className="mt-6 space-y-2">
            <header>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">Stored payload</h3>
              <p className="text-xs text-gray-400">
                Add a comment that persists across reloads. The vulnerable feed renders the HTML directly.
              </p>
            </header>
            <textarea
              value={storedDraft}
              onChange={(event) => setStoredDraft(event.target.value)}
              placeholder="<img src=x onerror=alert('stored') />"
              rows={3}
              className="w-full resize-none rounded border border-white/10 bg-black/40 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-sky-400 focus:outline-none"
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={commitStoredPayload}
                className="rounded bg-amber-400 px-3 py-1 text-sm font-medium text-black transition hover:bg-amber-300"
              >
                Store payload
              </button>
              <span className="text-xs text-gray-400">{storedEntries.length} stored</span>
            </div>
            {storedEntries.length > 0 ? (
              <ol className="space-y-1 rounded border border-white/10 bg-black/40 p-2 text-xs text-gray-300">
                {storedEntries.map((entry, index) => (
                  <li key={index} className="break-words">
                    {entry}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs italic text-gray-500">No stored payloads yet.</p>
            )}
          </section>

          <section className="mt-6 space-y-2">
            <header>
              <h3 className="text-sm font-semibold uppercase tracking-wide text-gray-300">DOM fragment</h3>
              <p className="text-xs text-gray-400">
                Represents a snippet a script injects into the DOM after load.
              </p>
            </header>
            <textarea
              value={domPayload}
              onChange={(event) => setDomPayload(event.target.value)}
              placeholder="<marquee>owned</marquee>"
              rows={3}
              className="w-full resize-none rounded border border-white/10 bg-black/40 px-2 py-1 text-sm text-white placeholder-gray-500 focus:border-sky-400 focus:outline-none"
            />
          </section>
        </aside>

        <section className="flex-1 bg-[#0b1120]">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-gray-300">Loading demo site…</div>
          ) : error ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-red-300">
              <p>{error}</p>
              <button
                type="button"
                onClick={() => {
                  void fetchPristine();
                }}
                className="rounded bg-sky-600 px-3 py-1 text-sm font-medium text-white transition hover:bg-sky-500"
              >
                Retry load
              </button>
            </div>
          ) : (
            <iframe
              key={iframeKey}
              title="XSS playground sandbox"
              className="h-full w-full border-0"
              sandbox={sandboxAttribute}
              srcDoc={iframeMarkup}
            />
          )}
        </section>
      </div>
    </div>
  );
};

export default LabHarness;
