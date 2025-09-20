'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';

export const HIGHLIGHT_CLASS = 'term-line-highlight';

const highlightLines = (query: string) => {
  const normalized = query.trim().toLowerCase();
  const lines = Array.from(
    document.querySelectorAll<HTMLElement>('.term-line'),
  );
  lines.forEach((line) => {
    const content = line.textContent?.toLowerCase() ?? '';
    const shouldHighlight = normalized.length > 0 && content.includes(normalized);
    if (shouldHighlight) {
      if (!line.classList.contains(HIGHLIGHT_CLASS)) {
        line.classList.add(HIGHLIGHT_CLASS);
      }
      line.setAttribute('data-term-highlight', 'true');
    } else {
      line.classList.remove(HIGHLIGHT_CLASS);
      line.removeAttribute('data-term-highlight');
    }
  });
};

const FindOverlay: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement | null>(null);

  const closeOverlay = useCallback(() => {
    setOpen(false);
    setQuery('');
    highlightLines('');
  }, []);

  useEffect(() => {
    highlightLines(query);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'f') {
        event.preventDefault();
        setOpen((prev) => {
          const next = !prev;
          if (next) {
            window.setTimeout(() => {
              inputRef.current?.focus();
              inputRef.current?.select();
            }, 0);
          } else {
            highlightLines('');
            setQuery('');
          }
          return next;
        });
      } else if (event.key === 'Escape' && open) {
        event.preventDefault();
        closeOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [closeOverlay, open]);

  useEffect(() => () => highlightLines(''), []);

  return (
    <>
      {open && (
        <div className="absolute right-2 top-2 z-20 flex items-center gap-2 rounded bg-gray-900/95 p-2 text-sm text-white shadow-lg">
          <label className="flex items-center gap-2" htmlFor="terminal-find-input">
            <span className="sr-only">Search terminal output</span>
            <input
              id="terminal-find-input"
              ref={inputRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-48 rounded bg-gray-800 px-2 py-1 text-white outline-none"
              placeholder="Find..."
              aria-label="Find in terminal"
            />
          </label>
          {query && (
            <button
              type="button"
              className="rounded bg-gray-700 px-2 py-1 text-xs uppercase tracking-wide"
              onClick={() => setQuery('')}
            >
              Clear
            </button>
          )}
        </div>
      )}
      <style jsx global>{`
        .term-line.${HIGHLIGHT_CLASS} {
          background-color: rgba(23, 147, 209, 0.35);
        }
      `}</style>
    </>
  );
};

export default FindOverlay;
