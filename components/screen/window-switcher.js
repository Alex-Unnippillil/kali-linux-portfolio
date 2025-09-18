import React, { useEffect, useState, useRef } from 'react';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const commitSelection = (id) => {
    if (!id) return;
    if (typeof onSelect === 'function') {
      onSelect(id);
    } else if (typeof onClose === 'function') {
      onClose();
    }
  };

  const filtered = windows.filter((w) =>
    w.title.toLowerCase().includes(query.toLowerCase())
  );

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
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSelected(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="bg-ub-grey p-4 rounded w-3/4 md:w-1/3">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus-visible-ring"
          placeholder="Search windows"
        />
        <ul role="listbox" aria-label="Open windows">
          {filtered.map((w, i) => (
            <li
              key={w.id}
              role="option"
              tabIndex={0}
              aria-selected={i === selected}
              onFocus={() => setSelected(i)}
              onClick={() => commitSelection(w.id)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  commitSelection(w.id);
                }
              }}
              className={`px-2 py-1 rounded focus-visible-ring ${i === selected ? 'bg-ub-orange text-black' : ''}`}
            >
              {w.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

