import React, { useEffect, useMemo, useRef, useState } from 'react';

const FALLBACK_PREVIEW = '/images/window-preview-fallback.svg';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(() => {
    return windows.filter((w) =>
      (w.title || '').toLowerCase().includes(query.toLowerCase())
    );
  }, [windows, query]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!filtered.length) {
      setSelected(0);
      return;
    }
    if (selected >= filtered.length) {
      setSelected(0);
    }
  }, [filtered, selected]);

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
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      const dir = e.shiftKey ? -1 : 1;
      setSelected((selected + dir + len) % len);
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

  const handleSelect = (id) => {
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
  };

  const handleHover = (index) => {
    setSelected(index);
  };

  const subtitleFor = (win) => {
    if (win.subtitle) return win.subtitle;
    if (win.id && win.title && win.id.toLowerCase() !== win.title.toLowerCase()) {
      return win.id;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="w-11/12 max-w-3xl rounded bg-ub-grey p-4 shadow-2xl md:w-2/3 lg:w-1/2">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="mb-4 w-full rounded border border-white/10 bg-black bg-opacity-20 px-3 py-2 text-sm focus:border-ub-orange focus:outline-none"
          placeholder="Search windows"
        />
        {windows.length === 0 ? (
          <div className="rounded border border-white/10 bg-black/30 px-3 py-6 text-center text-sm text-white/70">
            Collecting window previews…
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded border border-white/10 bg-black/30 px-3 py-6 text-center text-sm text-white/70">
            No windows match your search.
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((w, i) => {
              const preview = w.preview || FALLBACK_PREVIEW;
              const subtitle = subtitleFor(w);
              return (
                <li key={w.id}>
                  <button
                    type="button"
                    data-testid="window-switcher-item"
                    onClick={() => handleSelect(w.id)}
                    onMouseEnter={() => handleHover(i)}
                    className={`flex w-full items-center gap-3 rounded border border-transparent px-3 py-2 text-left transition focus:outline-none focus-visible:border-ub-orange focus-visible:ring-2 focus-visible:ring-ub-orange/70 ${
                      i === selected
                        ? 'bg-ub-orange text-black shadow-lg'
                        : 'bg-black/30 text-white hover:bg-black/40'
                    }`}
                  >
                    <div
                      data-testid="window-switcher-preview"
                      className="relative h-20 w-32 flex-shrink-0 overflow-hidden rounded border border-white/10 bg-black/40"
                    >
                      <img
                        src={preview}
                        alt={`${w.title} window preview`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                      {w.icon ? (
                        <img
                          src={w.icon}
                          alt={`${w.title} icon`}
                          className="absolute bottom-2 left-2 h-6 w-6 rounded bg-black/70 p-1 shadow-md"
                          loading="lazy"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{w.title}</p>
                      {subtitle ? (
                        <p className="truncate text-xs text-white/70">{subtitle}</p>
                      ) : null}
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

