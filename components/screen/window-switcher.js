import React, { useEffect, useState, useRef, useMemo } from 'react';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const [announcement, setAnnouncement] = useState('');

  const filtered = useMemo(
    () =>
      windows.filter((w) => w.title.toLowerCase().includes(query.toLowerCase())),
    [windows, query]
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (selected >= filtered.length && filtered.length) {
      setSelected(filtered.length - 1);
    }
  }, [filtered.length, selected]);

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

  useEffect(() => {
    if (!filtered.length) {
      setAnnouncement('No matching windows');
      return;
    }

    const activeWindow = filtered[selected];
    if (activeWindow) {
      setAnnouncement(`Selected window: ${activeWindow.title}`);
    }
  }, [filtered, selected]);

  const activeOptionId = filtered[selected]
    ? `window-switcher-option-${filtered[selected].id}`
    : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="bg-ub-grey p-4 rounded w-3/4 md:w-1/3">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
          placeholder="Search windows"
          aria-label="Search windows"
        />
        <ul
          role="listbox"
          aria-label="Open windows"
          aria-activedescendant={activeOptionId}
        >
          {filtered.map((w, i) => {
            const optionId = `window-switcher-option-${w.id}`;
            return (
              <li
                key={w.id}
                id={optionId}
                role="option"
                aria-selected={i === selected}
                className={`px-2 py-1 rounded ${i === selected ? 'bg-ub-orange text-black' : ''}`}
              >
                {w.title}
              </li>
            );
          })}
        </ul>
        <div className="sr-only" aria-live="polite">
          {announcement}
        </div>
      </div>
    </div>
  );
}

