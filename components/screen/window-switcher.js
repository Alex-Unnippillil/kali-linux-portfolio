import React, { useEffect, useState, useRef, useCallback } from 'react';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  const filtered = windows.filter((w) =>
    w.title.toLowerCase().includes(query.toLowerCase())
  );

  const selectCurrentWindow = useCallback(() => {
    const win = filtered[selected];
    if (win && typeof onSelect === 'function') {
      onSelect(win.id);
      return true;
    }
    return false;
  }, [filtered, selected, onSelect]);

  const closeSwitcher = useCallback(() => {
    if (typeof onClose === 'function') {
      onClose();
      return true;
    }
    return selectCurrentWindow();
  }, [onClose, selectCurrentWindow]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        closeSwitcher();
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [closeSwitcher]);

  useEffect(() => {
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        if (!selectCurrentWindow()) {
          closeSwitcher();
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [selectCurrentWindow, closeSwitcher]);

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
      closeSwitcher();
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSelected(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div ref={containerRef} className="bg-ub-grey p-4 rounded w-3/4 md:w-1/3">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
          aria-label="Search windows"
          placeholder="Search windows"
        />
        <ul>
          {filtered.map((w, i) => (
            <li
              key={w.id}
              className={`px-2 py-1 rounded ${i === selected ? 'bg-ub-orange text-black' : ''}`}
            >
              {w.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

