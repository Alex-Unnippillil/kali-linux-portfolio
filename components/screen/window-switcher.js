import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export const WINDOW_SWITCHER_CYCLE_EVENT = 'desktop-window-switcher-cycle';

export default function WindowSwitcher({
  windows = [],
  onSelect,
  onClose,
  initialWindowId,
  cycleEventName = WINDOW_SWITCHER_CYCLE_EVENT,
}) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const inputRef = useRef(null);

  const normalizedQuery = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!normalizedQuery) {
      return windows;
    }
    return windows.filter((w) =>
      (w.title || '').toLowerCase().includes(normalizedQuery)
    );
  }, [windows, normalizedQuery]);

  useEffect(() => {
    if (!filtered.length) {
      if (selectedId !== null) {
        setSelectedId(null);
      }
      return;
    }

    if (selectedId && filtered.some((w) => w.id === selectedId)) {
      return;
    }

    if (initialWindowId && filtered.some((w) => w.id === initialWindowId)) {
      setSelectedId(initialWindowId);
      return;
    }

    setSelectedId(filtered[0].id);
  }, [filtered, initialWindowId, selectedId]);

  const selectedIndex = useMemo(() => {
    if (!filtered.length || !selectedId) {
      return -1;
    }
    return filtered.findIndex((w) => w.id === selectedId);
  }, [filtered, selectedId]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        if (filtered.length && selectedIndex >= 0) {
          const win = filtered[selectedIndex];
          if (win && typeof onSelect === 'function') {
            onSelect(win.id);
          }
        } else if (typeof onClose === 'function') {
          onClose();
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [filtered, selectedIndex, onSelect, onClose]);

  const moveSelection = useCallback(
    (direction) => {
      if (!filtered.length) return;
      const len = filtered.length;
      const current = selectedIndex >= 0 ? selectedIndex : 0;
      const nextIndex = (current + direction + len) % len;
      const nextWindow = filtered[nextIndex];
      if (nextWindow) {
        setSelectedId(nextWindow.id);
      }
    },
    [filtered, selectedIndex]
  );

  useEffect(() => {
    const handler = (event) => {
      if (!event || typeof event.detail !== 'object') return;
      const { direction } = event.detail;
      const step = direction < 0 ? -1 : 1;
      moveSelection(step);
    };
    window.addEventListener(cycleEventName, handler);
    return () => window.removeEventListener(cycleEventName, handler);
  }, [cycleEventName, moveSelection]);

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      moveSelection(e.shiftKey ? -1 : 1);
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const win = filtered[selectedIndex];
      if (win && typeof onSelect === 'function') {
        onSelect(win.id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof onClose === 'function') onClose();
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
  };

  const handleItemClick = (id) => {
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
  };

  const handleItemHover = (index) => {
    const target = filtered[index];
    if (target) {
      setSelectedId(target.id);
    }
  };

  const renderPlaceholderIcon = (title = '') => {
    const letter = title.trim().charAt(0).toUpperCase() || '?';
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-black/40 text-lg font-semibold">
        {letter}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="w-full max-w-5xl rounded-xl bg-ub-grey/95 p-6 shadow-2xl">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          aria-label="Search open windows"
          className="w-full rounded border border-white/10 bg-black/40 px-3 py-2 text-base focus:border-ub-orange focus:outline-none"
          placeholder="Search windows"
        />

        {filtered.length ? (
          <div className="mt-6 flex gap-4 overflow-x-auto pb-2">
            {filtered.map((w, index) => {
              const selected = index === selectedIndex;
              const displayTitle = (w.title || w.id || '').trim() || w.id;
              return (
                <button
                  key={w.id}
                  type="button"
                  onClick={() => handleItemClick(w.id)}
                  onMouseEnter={() => handleItemHover(index)}
                  onFocus={() => handleItemHover(index)}
                  className={`group flex w-48 flex-shrink-0 flex-col rounded-lg border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
                    selected
                      ? 'border-ub-orange bg-black/50'
                      : 'border-transparent bg-black/30 hover:border-white/20 hover:bg-black/40'
                  } ${w.minimized ? 'opacity-60' : ''}`}
                  aria-selected={selected}
                  aria-label={`Switch to ${displayTitle}`}
                  title={displayTitle}
                >
                  <div className="flex h-28 w-full items-center justify-center overflow-hidden rounded-t-lg bg-black/40">
                    {w.thumbnail ? (
                      <img
                        src={w.thumbnail}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : w.icon ? (
                      <img
                        src={w.icon}
                        alt=""
                        className="h-16 w-16 object-contain"
                      />
                    ) : (
                      renderPlaceholderIcon(displayTitle)
                    )}
                  </div>
                  <div className="flex w-full items-center gap-3 truncate px-3 py-3 text-left">
                    {w.icon ? (
                      <img
                        src={w.icon}
                        alt=""
                        className="h-6 w-6 flex-shrink-0 object-contain"
                      />
                    ) : (
                      <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded bg-white/10 text-xs font-semibold">
                        {displayTitle.charAt(0).toUpperCase() || '?'}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {displayTitle}
                      </p>
                      {w.minimized ? (
                        <p className="truncate text-xs text-gray-300">Minimized</p>
                      ) : null}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 rounded-lg bg-black/30 px-4 py-8 text-center text-sm text-gray-200">
            No windows match your search.
          </div>
        )}
      </div>
    </div>
  );
}

