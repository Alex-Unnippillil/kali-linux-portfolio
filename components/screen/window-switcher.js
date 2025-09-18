import React, { useEffect, useState, useRef, useId } from 'react';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const titleId = useId();
  const searchId = useId();
  const listboxId = useId();

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

  const activeId = filtered[selected]?.id ? `window-switcher-option-${filtered[selected].id}` : undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div
        className="bg-ub-grey p-4 rounded w-3/4 md:w-1/3"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId} className="sr-only">
          Switch windows
        </h2>
        <label htmlFor={searchId} className="sr-only">
          Filter windows
        </label>
        <input
          ref={inputRef}
          id={searchId}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
          placeholder="Search windows"
          aria-controls={listboxId}
        />
        <ul
          id={listboxId}
          role="listbox"
          aria-labelledby={titleId}
          aria-activedescendant={activeId}
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
      </div>
    </div>
  );
}

