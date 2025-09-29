"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import glossaryData from '../../data/glossary.json';
import { GlossaryEntry, filterGlossaryEntries } from '../../utils/glossary';

const ENTRIES = glossaryData as GlossaryEntry[];

const isEditableElement = (element: EventTarget | null) => {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const tagName = element.tagName;
  return (
    tagName === 'INPUT' ||
    tagName === 'TEXTAREA' ||
    element.isContentEditable ||
    (tagName === 'BUTTON' && element.getAttribute('role') === 'switch')
  );
};

const focusableSelector =
  'a[href], button:not([disabled]), input, textarea, [tabindex]:not([tabindex="-1"])';

const scrollIntoView = (element: HTMLElement | null) => {
  if (!element) return;
  element.scrollIntoView({ block: 'nearest' });
};

export default function GlossaryOverlay() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  const entries = useMemo(() => filterGlossaryEntries(ENTRIES, query), [query]);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActiveIndex(0);
    const handle = window.requestAnimationFrame(() => {
      searchRef.current?.focus();
    });
    return () => window.cancelAnimationFrame(handle);
  }, [open]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (isEditableElement(event.target)) {
        return;
      }

      if ((event.key === '?' || (event.key === '/' && event.shiftKey)) && !open) {
        event.preventDefault();
        setOpen(true);
        return;
      }

      if (event.key === 'Escape' && open) {
        event.preventDefault();
        setOpen(false);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;
      const focusable = panelRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!focusable || focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (active === first) {
          event.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (entries.length === 0) return;
    const ref = itemRefs.current[activeIndex];
    scrollIntoView(ref);
  }, [activeIndex, entries, open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const close = () => setOpen(false);

  const onBackdropClick = () => close();
  const onPanelClick: React.MouseEventHandler<HTMLDivElement> = (event) => {
    event.stopPropagation();
  };

  const onResultKeyDown = (
    event: React.KeyboardEvent<HTMLAnchorElement>,
    index: number,
    entry: GlossaryEntry,
  ) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, Math.max(entries.length - 1, 0)));
      itemRefs.current[Math.min(index + 1, entries.length - 1)]?.focus();
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
      itemRefs.current[Math.max(index - 1, 0)]?.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      window.open(entry.link, '_blank');
    }
  };

  return (
    <>
      <button
        type="button"
        aria-label="Open glossary"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="fixed top-2 right-2 z-40 bg-gray-700 text-white rounded-full w-9 h-9 flex items-center justify-center focus:outline-none focus:ring"
      >
        ?
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="glossary-overlay-title"
          className="fixed inset-0 z-50 bg-black/60 flex items-start justify-center p-4"
          onClick={onBackdropClick}
        >
          <div
            ref={panelRef}
            className="bg-white text-gray-900 w-full max-w-2xl rounded-lg shadow-xl overflow-hidden flex flex-col"
            onClick={onPanelClick}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h2 id="glossary-overlay-title" className="text-lg font-semibold">
                Glossary
              </h2>
              <button
                type="button"
                onClick={close}
                className="text-sm text-gray-600 hover:text-gray-900 focus:outline-none focus:ring"
              >
                Close
              </button>
            </div>
            <div className="px-4 py-3 border-b border-gray-200">
              <label htmlFor="glossary-search" className="block text-sm font-medium text-gray-700">
                Search terms
              </label>
              <input
                ref={searchRef}
                id="glossary-search"
                type="search"
                aria-label="Search glossary terms"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search by term, tag, or alias"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring focus:border-gray-500"
              />
              <p className="mt-2 text-xs text-gray-500">
                Tip: Press Shift + / to toggle the glossary from anywhere.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto" role="listbox" aria-label="Glossary results">
              {entries.length === 0 ? (
                <p className="px-4 py-6 text-sm text-gray-500">No matching terms found.</p>
              ) : (
                <ul className="divide-y divide-gray-200">
                  {entries.map((entry, index) => (
                    <li key={`${entry.id}-${index}`} className={index === activeIndex ? 'bg-gray-100' : undefined}>
                      <a
                        ref={(element) => {
                          itemRefs.current[index] = element;
                        }}
                        href={entry.link}
                        className="block px-4 py-3 focus:outline-none focus:ring focus:ring-offset-2 focus:ring-gray-400"
                        target="_blank"
                        rel="noreferrer"
                        onKeyDown={(event) => onResultKeyDown(event, index, entry)}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold text-gray-900">{entry.term}</span>
                          <span className="text-xs text-gray-500">Open docs ↗</span>
                        </div>
                        <p className="mt-1 text-sm text-gray-700">{entry.definition}</p>
                        {entry.tags && entry.tags.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {entry.tags.map((tag) => (
                              <span
                                key={tag}
                                className="inline-flex items-center rounded-full bg-gray-200 px-2 py-0.5 text-xs font-medium text-gray-700"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
