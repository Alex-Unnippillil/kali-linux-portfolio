'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import apps, { games, utilities } from '../../apps.config';
import {
  readRecentAppIds,
  writeRecentAppIds,
  clearRecentApps,
  RECENT_STORAGE_EVENT,
  RecentId,
} from '../../utils/recentStorage';

interface RecentAppMeta {
  id: string;
  title: string;
  icon: string;
  location: string;
}

const MAX_DISPLAY_COUNT = 10;

const isTextInputElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  const tag = target.tagName;
  if (tag === 'INPUT') {
    const type = (target as HTMLInputElement).type;
    return !['checkbox', 'radio', 'button', 'submit', 'reset', 'file', 'image'].includes(
      type.toLowerCase(),
    );
  }
  if (tag === 'TEXTAREA') return true;
  if (target.isContentEditable) return true;
  return false;
};

const focusableSelector =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

const RecentSwitcher: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [recentIds, setRecentIds] = useState<RecentId[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [pendingRestore, setPendingRestore] = useState<RecentId[] | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const utilitiesSet = useMemo(
    () => new Set((utilities as any[]).map(item => item.id)),
    [],
  );
  const gamesSet = useMemo(() => new Set((games as any[]).map(item => item.id)), []);

  const appMetaMap = useMemo(() => {
    const entries = new Map<string, RecentAppMeta>();
    (apps as any[]).forEach(app => {
      if (!app || typeof app.id !== 'string') return;
      const location = gamesSet.has(app.id)
        ? 'Games'
        : utilitiesSet.has(app.id)
        ? 'Utilities'
        : 'Applications';
      entries.set(app.id, {
        id: app.id,
        title: app.title || app.id,
        icon: app.icon || '/themes/Yaru/apps/applications-system.svg',
        location,
      });
    });
    return entries;
  }, [gamesSet, utilitiesSet]);

  const refreshRecents = useCallback(() => {
    const ids = readRecentAppIds();
    setRecentIds(ids);
  }, []);

  const recentEntries = useMemo(() => {
    return recentIds
      .map(id => appMetaMap.get(id))
      .filter((entry): entry is RecentAppMeta => Boolean(entry));
  }, [recentIds, appMetaMap]);

  const filteredEntries = useMemo(() => {
    const term = query.trim().toLowerCase();
    const entries = term
      ? recentEntries.filter(entry => {
          const haystack = `${entry.title} ${entry.id} ${entry.location}`.toLowerCase();
          return haystack.includes(term);
        })
      : recentEntries;
    return entries.slice(0, MAX_DISPLAY_COUNT);
  }, [query, recentEntries]);

  useEffect(() => {
    if (highlightedIndex >= filteredEntries.length) {
      setHighlightedIndex(filteredEntries.length > 0 ? filteredEntries.length - 1 : 0);
    }
  }, [filteredEntries, highlightedIndex]);

  const closeOverlay = useCallback(() => {
    setOpen(false);
  }, []);

  const openOverlay = useCallback(() => {
    setUndoAvailable(false);
    setPendingRestore(null);
    setConfirmingClear(false);
    refreshRecents();
    setQuery('');
    setHighlightedIndex(0);
    setOpen(true);
  }, [refreshRecents]);

  useEffect(() => {
    refreshRecents();
  }, [refreshRecents]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const isToggleKey = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'e';
      if (!isToggleKey) return;
      if (isTextInputElement(event.target)) return;
      event.preventDefault();
      if (open) {
        closeOverlay();
      } else {
        openOverlay();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [closeOverlay, open, openOverlay]);

  useEffect(() => {
    const handleRecentChange = () => {
      refreshRecents();
    };
    window.addEventListener(RECENT_STORAGE_EVENT, handleRecentChange);
    return () => {
      window.removeEventListener(RECENT_STORAGE_EVENT, handleRecentChange);
    };
  }, [refreshRecents]);

  useEffect(() => {
    if (!open) {
      if (previousFocusRef.current) {
        previousFocusRef.current.focus?.({ preventScroll: true });
        previousFocusRef.current = null;
      }
      return;
    }
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const focusInput = () => {
      const input = inputRef.current;
      if (input) {
        input.focus({ preventScroll: true });
        input.select?.();
      }
    };
    const frame = requestAnimationFrame(focusInput);
    return () => cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) {
        clearTimeout(undoTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeOverlay();
      }
    };
    window.addEventListener('keydown', keyHandler);
    return () => window.removeEventListener('keydown', keyHandler);
  }, [closeOverlay, open]);

  if (!open) {
    return null;
  }

  const focusWithinOverlay = (target: HTMLElement | null) => {
    if (!target) return false;
    const container = overlayRef.current;
    if (!container) return false;
    return container.contains(target);
  };

  const trapFocus = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') {
      return;
    }
    const container = overlayRef.current;
    if (!container) return;
    const focusable = Array.from(
      container.querySelectorAll<HTMLElement>(focusableSelector),
    ).filter(element => !element.hasAttribute('disabled'));
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const active = document.activeElement as HTMLElement | null;
    const currentIndex = active ? focusable.indexOf(active) : -1;
    let nextIndex = currentIndex;
    if (event.shiftKey) {
      nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
    } else {
      nextIndex = currentIndex === focusable.length - 1 || currentIndex === -1 ? 0 : currentIndex + 1;
    }
    event.preventDefault();
    focusable[nextIndex]?.focus({ preventScroll: true });
  };

  const handleSelect = (entry: RecentAppMeta | undefined) => {
    if (!entry) return;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-app', { detail: entry.id }));
    }
    closeOverlay();
  };

  const handleKeyNavigation = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setHighlightedIndex(index => (filteredEntries.length === 0 ? 0 : (index + 1) % filteredEntries.length));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlightedIndex(index => {
        if (filteredEntries.length === 0) return 0;
        return (index - 1 + filteredEntries.length) % filteredEntries.length;
      });
      return;
    }
    if (event.key === 'Enter') {
      if (!focusWithinOverlay(event.target as HTMLElement | null)) return;
      event.preventDefault();
      handleSelect(filteredEntries[highlightedIndex]);
    }
  };

  const handleOverlayKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    trapFocus(event);
    handleKeyNavigation(event);
  };

  const beginClear = () => {
    if (recentIds.length === 0) return;
    setConfirmingClear(true);
  };

  const cancelClear = () => {
    setConfirmingClear(false);
  };

  const confirmClear = () => {
    if (recentIds.length === 0) {
      setConfirmingClear(false);
      return;
    }
    const snapshot = [...recentIds];
    setPendingRestore(snapshot);
    clearRecentApps();
    refreshRecents();
    setConfirmingClear(false);
    setUndoAvailable(true);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
    }
    undoTimerRef.current = setTimeout(() => {
      setUndoAvailable(false);
      setPendingRestore(null);
      undoTimerRef.current = null;
    }, 5000);
  };

  const undoClear = () => {
    if (!pendingRestore) return;
    writeRecentAppIds(pendingRestore);
    refreshRecents();
    setUndoAvailable(false);
    setPendingRestore(null);
    if (undoTimerRef.current) {
      clearTimeout(undoTimerRef.current);
      undoTimerRef.current = null;
    }
  };

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-start justify-center bg-black/70 p-6"
      onKeyDown={handleOverlayKeyDown}
    >
      <div className="w-full max-w-xl rounded-lg bg-zinc-900 text-white shadow-xl">
        <div className="border-b border-white/10 px-4 py-3">
          <label htmlFor="recent-switcher-query" className="sr-only">
            Search recent apps
          </label>
          <input
            ref={inputRef}
            id="recent-switcher-query"
            value={query}
            onChange={event => {
              setQuery(event.target.value);
              setHighlightedIndex(0);
            }}
            aria-label="Search recent apps"
            className="w-full rounded-md bg-zinc-800 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-emerald-400"
            placeholder="Type to filter recent apps"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto px-2 py-3" role="listbox">
          {filteredEntries.length === 0 ? (
            <p className="px-2 py-4 text-sm text-zinc-300">No recent applications.</p>
          ) : (
            filteredEntries.map((entry, index) => (
              <button
                key={entry.id}
                type="button"
                data-testid="recent-switcher-item"
                onClick={() => handleSelect(entry)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className={
                  index === highlightedIndex
                    ? 'flex w-full items-center gap-3 rounded-md bg-emerald-600/30 px-3 py-2 text-left focus:outline-none'
                    : 'flex w-full items-center gap-3 rounded-md px-3 py-2 text-left focus:outline-none hover:bg-white/10'
                }
                aria-selected={index === highlightedIndex}
                role="option"
              >
                <img
                  src={entry.icon}
                  alt=""
                  className="h-8 w-8 flex-shrink-0 rounded"
                  aria-hidden="true"
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">{entry.title}</span>
                  <span className="truncate text-xs text-zinc-300">{entry.location}</span>
                </div>
                <span className="text-xs text-zinc-400">{entry.id}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={beginClear}
              className="rounded-md border border-white/20 px-3 py-1 hover:border-white/40 hover:bg-white/10"
            >
              Clear history
            </button>
            {confirmingClear && (
              <div className="flex items-center gap-2 text-xs text-zinc-200">
                <span>Clear all recent applications?</span>
                <button
                  type="button"
                  onClick={confirmClear}
                  className="rounded bg-red-600 px-2 py-1 text-white hover:bg-red-500"
                >
                  Confirm
                </button>
                <button
                  type="button"
                  onClick={cancelClear}
                  className="rounded border border-white/20 px-2 py-1 hover:border-white/40"
                >
                  Cancel
                </button>
              </div>
            )}
            {undoAvailable && !confirmingClear && (
              <div className="flex items-center gap-2 text-xs text-emerald-300">
                <span>History cleared.</span>
                <button
                  type="button"
                  onClick={undoClear}
                  className="rounded border border-emerald-400 px-2 py-1 text-emerald-200 hover:bg-emerald-500/20"
                >
                  Undo (5s)
                </button>
              </div>
            )}
          </div>
          <span className="text-xs text-zinc-400">Press Esc to close</span>
        </div>
      </div>
    </div>
  );
};

export default RecentSwitcher;
