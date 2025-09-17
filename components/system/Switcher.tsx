'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { KeyboardEvent as ReactKeyboardEvent } from 'react';
import { toCanvas } from 'html-to-image';

import {
  DEFAULT_THUMBNAIL_BUDGET,
  ThumbnailCache,
} from './thumbnailCache';

type PerformanceMemory = {
  jsHeapSizeLimit: number;
  totalJSHeapSize: number;
  usedJSHeapSize: number;
};

const THUMBNAIL_MEMORY_LIMIT = DEFAULT_THUMBNAIL_BUDGET;
const RECYCLE_RETRY_DELAY = 1500;
const EVICTION_LOG_RETENTION = RECYCLE_RETRY_DELAY * 4;

interface SwitcherWindow {
  id: string;
  title: string;
  icon?: string;
}

interface SwitcherProps {
  windows?: SwitcherWindow[];
  onSelect?: (id: string) => void;
  onClose?: () => void;
}

const normalizeIcon = (icon?: string): string => {
  if (!icon) return '/themes/Yaru/system/view-app-grid-symbolic.svg';
  return icon.startsWith('./') ? icon.slice(1) : icon;
};

const formatMegabytes = (bytes: number): string => (bytes / (1024 * 1024)).toFixed(2);

export default function Switcher({
  windows = [],
  onSelect,
  onClose,
}: SwitcherProps) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [version, setVersion] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef(new ThumbnailCache(THUMBNAIL_MEMORY_LIMIT));
  const captureQueueRef = useRef(new Set<string>());
  const captureTimeoutRef = useRef<Map<string, number>>(new Map());
  const recentlyEvictedRef = useRef<Map<string, number>>(new Map());
  const failedRef = useRef<Set<string>>(new Set());

  const bumpVersion = useCallback(() => {
    setVersion((prev) => (prev + 1) % Number.MAX_SAFE_INTEGER);
  }, []);

  const profileThumbnails = useCallback(() => {
    if (typeof window === 'undefined') return;
    const totalBytes = cacheRef.current.getTotalBytes();
    const usageMb = totalBytes / (1024 * 1024);
    const limitMb = THUMBNAIL_MEMORY_LIMIT / (1024 * 1024);
    const performanceMemory =
      typeof window.performance !== 'undefined' &&
      'memory' in window.performance
        ? (window.performance as Performance & { memory: PerformanceMemory }).memory
        : null;
    const heapSegment = performanceMemory
      ? ` | heap ${(
          performanceMemory.usedJSHeapSize /
          (1024 * 1024)
        ).toFixed(2)} / ${(performanceMemory.jsHeapSizeLimit / (1024 * 1024)).toFixed(2)} MB`
      : '';
    // eslint-disable-next-line no-console
    console.debug(
      `[WindowSwitcher] thumbnails ${usageMb.toFixed(2)} / ${limitMb.toFixed(0)} MB${heapSegment}`
    );
  }, []);

  const cleanupEvictionLog = useCallback(() => {
    const now = Date.now();
    const cutoff = now - EVICTION_LOG_RETENTION;
    recentlyEvictedRef.current.forEach((timestamp, id) => {
      if (timestamp < cutoff) {
        recentlyEvictedRef.current.delete(id);
      }
    });
  }, []);

  const ensureThumbnail = useCallback(
    (win: SwitcherWindow, options?: { force?: boolean; refresh?: boolean }) => {
      if (typeof document === 'undefined') return;
      const { force = false, refresh = false } = options ?? {};
      const cache = cacheRef.current;

      cleanupEvictionLog();

      const hasEntry = cache.has(win.id);
      if (hasEntry && !refresh) {
        return;
      }

      if (!force && !refresh && failedRef.current.has(win.id)) {
        return;
      }

      const evictedAt = recentlyEvictedRef.current.get(win.id);
      if (!force && !refresh && evictedAt && Date.now() - evictedAt < RECYCLE_RETRY_DELAY) {
        return;
      }

      if (captureQueueRef.current.has(win.id)) {
        return;
      }

      captureQueueRef.current.add(win.id);

      const timeoutId =
        typeof window !== 'undefined'
          ? window.setTimeout(async () => {
              try {
                const node = document.getElementById(win.id);
                if (!node) {
                  return;
                }

                let dataUrl: string | null = null;
                const canvas = node.querySelector('canvas') as HTMLCanvasElement | null;
                if (canvas && typeof canvas.toDataURL === 'function') {
                  try {
                    dataUrl = canvas.toDataURL('image/png');
                  } catch {
                    dataUrl = null;
                  }
                }

                if (!dataUrl) {
                  try {
                    const rendered = await toCanvas(node);
                    dataUrl = rendered.toDataURL('image/png');
                  } catch {
                    dataUrl = null;
                  }
                }

                if (!dataUrl) {
                  failedRef.current.add(win.id);
                  recentlyEvictedRef.current.set(win.id, Date.now());
                  return;
                }

                const result = cache.upsert(win.id, dataUrl);
                if (!result.stored) {
                  failedRef.current.add(win.id);
                  recentlyEvictedRef.current.set(win.id, Date.now());
                  return;
                }

                failedRef.current.delete(win.id);
                recentlyEvictedRef.current.delete(win.id);

                if (result.evicted.length) {
                  const stamp = Date.now();
                  result.evicted.forEach((id) => {
                    recentlyEvictedRef.current.set(id, stamp);
                    failedRef.current.delete(id);
                  });
                }

                bumpVersion();
                profileThumbnails();
              } finally {
                captureQueueRef.current.delete(win.id);
                const storedId = captureTimeoutRef.current.get(win.id);
                if (typeof storedId === 'number' && typeof window !== 'undefined') {
                  window.clearTimeout(storedId);
                }
                captureTimeoutRef.current.delete(win.id);
              }
            }, 48)
          : undefined;

      if (typeof timeoutId === 'number') {
        captureTimeoutRef.current.set(win.id, timeoutId);
      } else {
        captureQueueRef.current.delete(win.id);
      }
    },
    [cleanupEvictionLog, bumpVersion, profileThumbnails]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
      return windows;
    }
    return windows.filter((win) => win.title.toLowerCase().includes(normalized));
  }, [windows, query]);

  useEffect(() => {
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key === 'Alt') {
        const target = filtered[selected];
        if (target && typeof onSelect === 'function') {
          onSelect(target.id);
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('keyup', handleKeyUp);
      }
    };
  }, [filtered, onClose, onSelect, selected]);

  useEffect(() => {
    if (selected >= filtered.length) {
      setSelected(filtered.length ? filtered.length - 1 : 0);
    }
  }, [filtered, selected]);

  useEffect(() => {
    filtered.forEach((win) => ensureThumbnail(win));
  }, [filtered, ensureThumbnail]);

  useEffect(() => {
    const activeIds = new Set(windows.map((win) => win.id));
    const removed = cacheRef.current.prune(activeIds);
    if (removed.length) {
      removed.forEach((id) => {
        recentlyEvictedRef.current.delete(id);
        failedRef.current.delete(id);
      });
      bumpVersion();
      profileThumbnails();
    }
  }, [windows, bumpVersion, profileThumbnails]);

  useEffect(() => {
    const current = filtered[selected];
    if (!current) return;
    if (cacheRef.current.has(current.id)) {
      cacheRef.current.touch(current.id);
    } else {
      ensureThumbnail(current, { force: true });
    }
  }, [filtered, selected, ensureThumbnail]);

  useEffect(() => {
    profileThumbnails();
  }, [profileThumbnails]);

  useEffect(
    () => () => {
      if (typeof window === 'undefined') return;
      captureTimeoutRef.current.forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
      captureTimeoutRef.current.clear();
      captureQueueRef.current.clear();
    },
    []
  );

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Tab') {
      event.preventDefault();
      if (!filtered.length) return;
      const direction = event.shiftKey ? -1 : 1;
      setSelected((prev) => (prev + direction + filtered.length) % filtered.length);
    } else if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!filtered.length) return;
      setSelected((prev) => (prev + 1) % filtered.length);
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!filtered.length) return;
      setSelected((prev) => (prev - 1 + filtered.length) % filtered.length);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (typeof onClose === 'function') {
        onClose();
      }
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const target = filtered[selected];
      if (target && typeof onSelect === 'function') {
        onSelect(target.id);
      }
    }
  };

  const handleBackgroundClick = () => {
    if (typeof onClose === 'function') {
      onClose();
    }
  };

  const memorySummary = useMemo(() => {
    const total = cacheRef.current.getTotalBytes();
    return `${formatMegabytes(total)} / ${(THUMBNAIL_MEMORY_LIMIT / (1024 * 1024)).toFixed(
      0
    )} MB`;
  }, [version]);

  const renderPreview = (win: SwitcherWindow) => {
    const entry = cacheRef.current.get(win.id);
    if (entry?.dataUrl) {
      return (
        <img
          src={entry.dataUrl}
          alt={`Preview of ${win.title}`}
          className="h-20 w-32 rounded object-cover transition-opacity duration-150 ease-out"
          width={128}
          height={80}
        />
      );
    }
    return (
      <div className="flex h-20 w-32 items-center justify-center rounded bg-black bg-opacity-30 text-xs text-white">
        No preview
      </div>
    );
  };

  const activeDescendant = filtered[selected]?.id
    ? `switcher-option-${filtered[selected]?.id}`
    : undefined;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white"
      role="dialog"
      aria-modal="true"
      onClick={handleBackgroundClick}
    >
      <div
        className="w-11/12 max-w-3xl rounded bg-ub-grey p-4 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <label className="flex-1">
            <span className="sr-only">Filter windows</span>
            <input
              ref={inputRef}
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setSelected(0);
              }}
              onKeyDown={handleKeyDown}
              className="w-full rounded bg-black bg-opacity-20 px-3 py-2 text-base text-white focus:outline-none focus:ring-2 focus:ring-ub-orange"
              placeholder="Search windows"
              aria-label="Search open windows"
            />
          </label>
          <span className="text-xs text-ubt-grey text-opacity-80">Cache {memorySummary}</span>
        </div>
        {filtered.length === 0 ? (
          <p className="rounded bg-black bg-opacity-30 px-3 py-6 text-center text-sm text-white text-opacity-80">
            No matching windows found.
          </p>
        ) : (
          <ul
            role="listbox"
            aria-activedescendant={activeDescendant}
            className="grid max-h-[60vh] grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2"
          >
            {filtered.map((win, index) => {
              const isActive = index === selected;
              const baseClasses =
                'flex w-full items-center gap-4 rounded border border-transparent p-2 text-left transition';
              const activeClasses = isActive
                ? ' border-ub-orange bg-black bg-opacity-30'
                : ' hover:bg-black hover:bg-opacity-20';
              const optionId = `switcher-option-${win.id}`;
              return (
                <li key={win.id} id={optionId} role="option" aria-selected={isActive}>
                  <button
                    type="button"
                    onMouseEnter={() => {
                      setSelected(index);
                      if (!cacheRef.current.has(win.id)) {
                        ensureThumbnail(win);
                      }
                    }}
                    onFocus={() => {
                      setSelected(index);
                      if (!cacheRef.current.has(win.id)) {
                        ensureThumbnail(win);
                      }
                    }}
                    onClick={() => {
                      if (typeof onSelect === 'function') {
                        onSelect(win.id);
                      }
                    }}
                    className={`${baseClasses}${activeClasses}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <div className="overflow-hidden rounded">{renderPreview(win)}</div>
                      <img
                        src={normalizeIcon(win.icon)}
                        alt="App icon"
                        className="h-6 w-6"
                        width={24}
                        height={24}
                      />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{win.title}</p>
                      <p className="text-xs text-ubt-grey text-opacity-80">{win.id}</p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
