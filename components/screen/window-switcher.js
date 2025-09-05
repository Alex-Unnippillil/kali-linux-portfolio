import React, { useEffect, useState, useRef } from 'react';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const columns = 3;

  const filtered = windows.filter((w) =>
    w.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e) => {
    const len = filtered.length;
    if (!len) return;

    if (e.key === 'Tab') {
      e.preventDefault();
      const dir = e.shiftKey ? -1 : 1;
      setSelected((selected + dir + len) % len);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSelected((selected + 1) % len);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSelected((selected - 1 + len) % len);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((selected + columns) % len);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((selected - columns + len) % len);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const win = filtered[selected];
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
    setSelected(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="bg-ub-grey p-4 rounded w-3/4 md:w-1/2 lg:w-1/3">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
          placeholder="Search windows"
          aria-label="Search windows"
        />
        <ul className="grid grid-cols-3 gap-2">
          {filtered.map((w, i) => (
            <li
              key={w.id}
              className={`px-2 py-1 rounded text-center ${i === selected ? 'bg-ub-orange text-black' : 'bg-black bg-opacity-20'}`}
            >
              {w.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

