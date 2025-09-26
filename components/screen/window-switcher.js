import React, { useEffect, useState, useRef } from 'react';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center text-[var(--kali-text-strong)]"
      style={{ backgroundColor: 'var(--kali-overlay-medium)' }}
    >
      <div
        className="p-4 rounded border shadow-lg w-3/4 md:w-1/3"
        style={{
          backgroundColor: 'var(--kali-panel)',
          borderColor: 'var(--kali-panel-border)',
          boxShadow: '0 12px 30px color-mix(in srgb, var(--color-inverse), transparent 85%)',
        }}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-2 py-1 rounded border placeholder:text-[color:var(--kali-text-subtle)] focus:outline-none focus-visible:outline-none"
          placeholder="Search windows"
          style={{
            backgroundColor: 'var(--kali-input-bg)',
            borderColor: 'var(--kali-input-border)',
            color: 'var(--kali-text-strong)',
          }}
        />
        <ul>
          {filtered.map((w, i) => (
            <li
              key={w.id}
              className="px-2 py-1 rounded transition-colors"
              style={
                i === selected
                  ? {
                      backgroundColor: 'var(--color-accent)',
                      color: 'var(--color-inverse)',
                    }
                  : { color: 'var(--kali-text-strong)' }
              }
              aria-selected={i === selected}
            >
              {w.title}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

