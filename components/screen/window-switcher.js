import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  const filtered = useMemo(
    () => windows.filter((w) => w.title.toLowerCase().includes(query.toLowerCase())),
    [windows, query],
  );

  const handleClose = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  useFocusTrap(true, containerRef, {
    initialFocusRef: inputRef,
    onEscape: handleClose,
  });

  useEffect(() => {
    setSelected(0);
  }, [query, filtered.length]);

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
      setSelected((prev) => (prev + dir + len) % len);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      setSelected((prev) => (prev + 1) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const len = filtered.length;
      if (!len) return;
      setSelected((prev) => (prev - 1 + len) % len);
    }
  };

  const handleSubmit = (id) => {
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
  };

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="window-switcher-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white"
      tabIndex={-1}
    >
      <div className="w-11/12 max-w-xl rounded bg-ub-grey p-4 shadow-lg">
        <header className="mb-4 flex items-center justify-between">
          <h1 id="window-switcher-title" className="text-lg font-semibold text-white">
            Switch windows
          </h1>
          <button
            type="button"
            onClick={handleClose}
            className="rounded bg-black bg-opacity-30 px-3 py-1 text-sm text-white transition hover:bg-opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
            aria-label="Close window switcher"
          >
            Close
          </button>
        </header>
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          className="mb-4 w-full rounded bg-black bg-opacity-20 px-2 py-1 focus:outline-none"
          placeholder="Search windows"
          aria-label="Search windows"
        />
        <ul role="listbox" aria-label="Open windows" className="max-h-64 space-y-2 overflow-y-auto pr-1">
          {filtered.map((w, i) => (
            <li key={w.id} role="presentation">
              <button
                type="button"
                className={`flex w-full justify-between rounded px-3 py-2 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-white/70 ${
                  i === selected ? 'bg-ub-orange text-black' : 'bg-black/30 hover:bg-black/50'
                }`}
                role="option"
                aria-selected={i === selected}
                onClick={() => handleSubmit(w.id)}
              >
                <span>{w.title}</span>
              </button>
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="rounded bg-black/30 px-3 py-2 text-sm text-white/80">
              No windows match your search.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
