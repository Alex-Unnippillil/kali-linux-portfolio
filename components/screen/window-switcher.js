import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ensureWindowThumbnail,
  getWindowThumbnail,
  subscribeWindowThumbnail,
} from '../../utils/windowThumbnails';

function useWindowThumbnail(windowId) {
  const [snapshot, setSnapshot] = useState(() =>
    windowId ? getWindowThumbnail(windowId) : null
  );

  useEffect(() => {
    if (!windowId) return undefined;
    setSnapshot(getWindowThumbnail(windowId));
    return subscribeWindowThumbnail(windowId, setSnapshot);
  }, [windowId]);

  return snapshot;
}

function WindowThumbnail({ windowId, icon, title }) {
  const canvasRef = useRef(null);
  const snapshot = useWindowThumbnail(windowId);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    if (!snapshot || !snapshot.bitmap) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    canvas.width = snapshot.width;
    canvas.height = snapshot.height;
    context.clearRect(0, 0, snapshot.width, snapshot.height);
    context.drawImage(snapshot.bitmap, 0, 0, snapshot.width, snapshot.height);
  }, [snapshot]);

  return (
    <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-md bg-black bg-opacity-40">
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className={`h-full w-full object-cover transition-opacity duration-150 ${
          snapshot && snapshot.bitmap ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {!(snapshot && snapshot.bitmap) && (
        <div className="flex h-full w-full items-center justify-center text-center text-sm text-white text-opacity-80">
          {icon ? (
            <img
              src={icon}
              alt=""
              className="h-12 w-12"
              aria-hidden="true"
            />
          ) : (
            <span>{title}</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const filtered = useMemo(
    () =>
      windows.filter((w) =>
        w.title.toLowerCase().includes(query.toLowerCase())
      ),
    [query, windows]
  );

  useEffect(() => {
    windows.forEach((win) => ensureWindowThumbnail(win.id));
  }, [windows]);

  useEffect(() => {
    if (filtered.length === 0) {
      setSelected(0);
      return;
    }
    if (selected >= filtered.length) {
      setSelected(filtered.length - 1);
    }
  }, [filtered, selected]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

  const handleItemFocus = (index) => {
    setSelected(index);
  };

  const handleItemSelect = (win) => {
    if (typeof onSelect === 'function') {
      onSelect(win.id);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 px-4 py-6 text-white">
      <div className="w-full max-w-5xl rounded-lg bg-ub-grey/95 p-4 shadow-2xl">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="mb-4 w-full rounded-md bg-black bg-opacity-30 px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-ub-orange"
          placeholder="Search windows"
          aria-label="Search open windows"
        />
        {filtered.length === 0 ? (
          <p className="text-sm text-white text-opacity-70">No windows match your search.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((win, index) => (
              <button
                key={win.id}
                type="button"
                onClick={() => handleItemSelect(win)}
                onMouseEnter={() => handleItemFocus(index)}
                onFocus={() => handleItemFocus(index)}
                className={`flex flex-col rounded-lg border border-transparent bg-black bg-opacity-20 p-3 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ub-orange ${
                  index === selected
                    ? 'border-ub-orange bg-black bg-opacity-40 text-white'
                    : 'hover:border-white/40 hover:bg-black hover:bg-opacity-30'
                }`}
                aria-pressed={index === selected}
              >
                <WindowThumbnail windowId={win.id} icon={win.icon} title={win.title} />
                <div className="mt-3 flex items-center justify-between">
                  <span className="truncate text-sm font-semibold">{win.title}</span>
                  <span className="ml-2 text-xs uppercase text-white text-opacity-60">{win.id}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

