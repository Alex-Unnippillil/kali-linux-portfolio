import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { toPng } from 'html-to-image';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [thumbnails, setThumbnails] = useState({});
  const inputRef = useRef(null);
  const thumbnailsRef = useRef({});

  const filtered = useMemo(
    () =>
      windows.filter((w) =>
        (w.title || '').toLowerCase().includes(query.toLowerCase())
      ),
    [windows, query]
  );

  useEffect(() => {
    thumbnailsRef.current = thumbnails;
  }, [thumbnails]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (selected >= filtered.length && filtered.length) {
      setSelected(filtered.length - 1);
    } else if (!filtered.length && selected !== 0) {
      setSelected(0);
    }
  }, [filtered, selected]);

  const captureWindow = useCallback(async (id) => {
    if (typeof document === 'undefined') return null;
    const node = document.getElementById(id);
    if (!node) return null;

    let dataUrl = null;

    const canvas = node.querySelector('canvas');
    if (canvas && typeof canvas.toDataURL === 'function') {
      try {
        dataUrl = canvas.toDataURL();
      } catch (e) {
        dataUrl = null;
      }
    }

    if (!dataUrl) {
      try {
        dataUrl = await toPng(node, { cacheBust: true, pixelRatio: 1 });
      } catch (e) {
        dataUrl = null;
      }
    }

    return dataUrl;
  }, []);

  useEffect(() => {
    const openIds = new Set(windows.map((w) => w.id));
    setThumbnails((prev) => {
      const next = {};
      let changed = false;
      for (const [id, url] of Object.entries(prev)) {
        if (openIds.has(id)) {
          next[id] = url;
        } else {
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [windows]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    let cancelled = false;

    const loadThumbnails = async () => {
      for (const win of filtered) {
        if (cancelled) return;
        if (thumbnailsRef.current[win.id]) continue;
        const dataUrl = await captureWindow(win.id);
        if (cancelled || !dataUrl) continue;
        setThumbnails((prev) => {
          if (prev[win.id] === dataUrl) return prev;
          return { ...prev, [win.id]: dataUrl };
        });
      }
    };

    loadThumbnails();

    return () => {
      cancelled = true;
    };
  }, [filtered, captureWindow]);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const current = filtered[selected];
    if (!current) return undefined;
    let cancelled = false;

    (async () => {
      const dataUrl = await captureWindow(current.id);
      if (!cancelled && dataUrl) {
        setThumbnails((prev) => {
          if (prev[current.id] === dataUrl) return prev;
          return { ...prev, [current.id]: dataUrl };
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [filtered, selected, captureWindow]);

  useEffect(() => {
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        const win = filtered[selected];
        if (win && typeof onSelect === 'function') {
          onSelect(win.id);
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [filtered, selected, onSelect, onClose]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      if (e.altKey) {
        e.preventDefault();
        const len = filtered.length;
        if (!len) return;
        const dir = e.shiftKey ? -1 : 1;
        setSelected((selected + dir + len) % len);
      }
      return;
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      setSelected((selected + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      setSelected((selected - 1 + len) % len);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof onClose === 'function') onClose();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const win = filtered[selected];
      if (win && typeof onSelect === 'function') {
        onSelect(win.id);
      }
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSelected(0);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="window-switcher-heading"
    >
      <div className="w-11/12 max-w-3xl rounded-lg bg-ub-grey p-4 shadow-xl">
        <h2
          id="window-switcher-heading"
          className="mb-3 text-lg font-semibold text-white"
        >
          Switch windows
        </h2>
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Search windows"
          className="mb-4 w-full rounded bg-black bg-opacity-20 px-3 py-2 text-base text-white placeholder-white/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-ub-grey"
          placeholder="Search windows"
        />
        {filtered.length ? (
          <ul
            role="listbox"
            aria-activedescendant={filtered[selected] ? `window-switcher-item-${filtered[selected].id}` : undefined}
            className="flex flex-col gap-2"
          >
            {filtered.map((w, i) => {
              const iconSrc = w.icon ? w.icon.replace('./', '/') : null;
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={i === selected}
                    id={`window-switcher-item-${w.id}`}
                    onClick={() => {
                      if (typeof onSelect === 'function') {
                        onSelect(w.id);
                      }
                    }}
                    onMouseEnter={() => setSelected(i)}
                    onFocus={() => setSelected(i)}
                    className={`group flex w-full items-center gap-4 rounded-lg border border-transparent p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-ub-grey ${
                      i === selected
                        ? 'bg-ub-orange/90 text-black shadow-lg'
                        : 'bg-white/5 text-white hover:bg-white/10'
                    }`}
                  >
                    <div className="flex h-16 w-28 flex-none items-center justify-center overflow-hidden rounded-md border border-white/10 bg-black/60">
                      {thumbnails[w.id] ? (
                        <img
                          src={thumbnails[w.id]}
                          alt={`Live view of ${w.title}`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-xs text-white/60">
                          {iconSrc ? (
                            <Image
                              src={iconSrc}
                              alt=""
                              width={32}
                              height={32}
                              className="h-8 w-8"
                              aria-hidden="true"
                            />
                          ) : (
                            <span className="flex h-8 w-8 items-center justify-center rounded bg-white/10" aria-hidden="true">
                              •
                            </span>
                          )}
                          <span>No preview</span>
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {iconSrc ? (
                          <Image
                            src={iconSrc}
                            alt=""
                            width={24}
                            height={24}
                            className="h-6 w-6 flex-none"
                            aria-hidden="true"
                          />
                        ) : (
                          <span className="h-6 w-6 flex-none rounded bg-black/40" aria-hidden="true" />
                        )}
                        <span className="truncate text-base font-semibold">
                          {w.title}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-white/70">
                        Press Enter to open or Esc to cancel
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-white/70">No windows match your search.</p>
        )}
      </div>
    </div>
  );
}

