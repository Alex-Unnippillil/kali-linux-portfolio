'use client';

import React, {
  useState,
  useMemo,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import Image from 'next/image';
import apps from '../../apps.config';
import { readRecentAppIds } from '../../utils/recentStorage';
import { useFocusTrap } from '../../hooks/useFocusTrap';

type AppMeta = {
  id: string;
  title: string;
  icon: string;
  disabled?: boolean;
  favourite?: boolean;
};

const MAX_RESULTS = 12;

const normalize = (value: string) => value.trim().toLowerCase();

const QuickSearchLauncher: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [highlightIndex, setHighlightIndex] = useState(0);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const overlayRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const allApps = useMemo(() => apps as unknown as AppMeta[], []);
  const favouriteApps = useMemo(() => allApps.filter(app => app.favourite), [allApps]);

  useEffect(() => {
    setRecentIds(readRecentAppIds());
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setRecentIds(readRecentAppIds());
  }, [isOpen]);

  const recentApps = useMemo(() => {
    const mapById = new Map(allApps.map(app => [app.id, app] as const));
    return recentIds
      .map(id => mapById.get(id))
      .filter((item): item is AppMeta => Boolean(item));
  }, [allApps, recentIds]);

  const quickResults = useMemo(() => {
    const normalizedQuery = normalize(query);

    if (!normalizedQuery) {
      const seen = new Set<string>();
      const orderedSources = [recentApps, favouriteApps, allApps];
      const combined: AppMeta[] = [];

      for (const source of orderedSources) {
        for (const item of source) {
          if (seen.has(item.id)) continue;
          seen.add(item.id);
          combined.push(item);
          if (combined.length >= MAX_RESULTS) {
            return combined;
          }
        }
      }

      return combined;
    }

    return allApps
      .filter(app => normalize(app.title).includes(normalizedQuery))
      .slice(0, MAX_RESULTS);
  }, [allApps, favouriteApps, query, recentApps]);

  useEffect(() => {
    if (!isOpen) return;
    setHighlightIndex(quickResults.length > 0 ? 0 : -1);
  }, [isOpen, quickResults.length]);

  const closeOverlay = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setHighlightIndex(0);
  }, []);

  const openOverlay = useCallback(
    (restoreTarget?: HTMLElement | null) => {
      restoreFocusRef.current = restoreTarget ?? (document.activeElement as HTMLElement | null);
      setQuery('');
      setHighlightIndex(0);
      setIsOpen(true);
    },
    [],
  );

  useEffect(() => {
    const handleGlobalKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (!event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) {
        return;
      }
      if (event.code !== 'Space') {
        return;
      }
      if (isOpen) {
        return;
      }
      event.preventDefault();
      openOverlay(document.activeElement as HTMLElement | null);
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, openOverlay]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
        return;
      }

      if (quickResults.length === 0) {
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setHighlightIndex((current) => Math.min(current + 1, quickResults.length - 1));
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        setHighlightIndex((current) => Math.max(current - 1, 0));
      } else if (event.key === 'Enter') {
        if (highlightIndex < 0) return;
        const app = quickResults[highlightIndex];
        if (!app || app.disabled) return;
        event.preventDefault();
        window.dispatchEvent(new CustomEvent('open-app', { detail: app.id }));
        closeOverlay();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeOverlay, highlightIndex, isOpen, quickResults]);

  useFocusTrap(overlayRef, isOpen, {
    initialFocusRef: searchInputRef,
    restoreFocusRef,
  });

  const handleBackdropMouseDown = (event: React.MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget) {
      closeOverlay();
    }
  };

  const handleOpenButtonClick = () => {
    openOverlay(buttonRef.current);
  };

  const handleResultClick = (app: AppMeta) => {
    if (app.disabled) return;
    window.dispatchEvent(new CustomEvent('open-app', { detail: app.id }));
    closeOverlay();
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpenButtonClick}
        aria-label="Open quick search"
        aria-haspopup="dialog"
        className="flex h-8 w-8 items-center justify-center rounded-md text-white/80 transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53b9ff] focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="h-4 w-4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/75 px-4 py-8"
          role="presentation"
          onMouseDown={handleBackdropMouseDown}
        >
          <div
            ref={overlayRef}
            role="dialog"
            aria-modal="true"
            aria-label="Quick application search"
            className="relative w-full max-w-xl transform rounded-3xl border border-white/10 bg-[#0f1a29] p-6 text-white shadow-2xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="relative mb-4">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="search"
                inputMode="search"
                enterKeyHint="search"
                placeholder="Search applications"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="h-12 w-full rounded-2xl border border-white/10 bg-[#101b2d] pl-12 pr-4 text-sm text-white placeholder:text-white/40 focus:border-[#53b9ff] focus:outline-none focus:ring-0"
                aria-label="Search applications"
                autoFocus
              />
            </div>
            {quickResults.length === 0 ? (
              <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-sm text-white/60">
                <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#121f33] text-[#4aa8ff]">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="9" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </span>
                <p>No applications match your search.</p>
              </div>
            ) : (
                <ul className="max-h-[420px] space-y-2 overflow-y-auto" role="listbox">
                  {quickResults.map((app, index) => (
                    <li key={app.id}>
                      <button
                        type="button"
                        role="option"
                        aria-label={app.title}
                        aria-selected={index === highlightIndex}
                        onClick={() => handleResultClick(app)}
                        onMouseEnter={() => setHighlightIndex(index)}
                        disabled={app.disabled}
                        className={`flex w-full items-center justify-between gap-4 rounded-2xl px-4 py-3 text-left text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#53b9ff] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0f1a29] ${
                          index === highlightIndex
                            ? 'bg-[#162438] text-white shadow-[0_0_0_1px_rgba(83,185,255,0.35)]'
                            : 'text-white/80 hover:bg-[#142132]'
                        } ${app.disabled ? 'cursor-not-allowed opacity-60' : ''}`}
                      >
                      <div className="flex items-center gap-4">
                        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#121f33]">
                          <Image
                            src={app.icon}
                            alt=""
                            width={28}
                            height={28}
                            className="h-7 w-7"
                            sizes="28px"
                          />
                        </span>
                        <span className="flex flex-col">
                          <span className="text-[15px] font-medium">{app.title}</span>
                          {app.favourite ? (
                            <span className="text-xs uppercase tracking-[0.25em] text-[#4aa8ff]">Favourite</span>
                          ) : (
                            <span className="text-xs uppercase tracking-[0.25em] text-white/30">Application</span>
                          )}
                        </span>
                      </div>
                      <svg
                        className="h-4 w-4 flex-shrink-0 text-[#4aa8ff]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default QuickSearchLauncher;
