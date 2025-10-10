import React, { useEffect, useState, useRef } from 'react';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const dialogRef = useRef(null);

  const filtered = windows.filter((w) =>
    w.title.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return undefined;

    const handleFocusIn = (event) => {
      if (node && !node.contains(event.target)) {
        event.stopPropagation();
        inputRef.current?.focus();
      }
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Tab') return;

      const focusable = node.querySelectorAll(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusable.length) {
        event.preventDefault();
        inputRef.current?.focus();
        return;
      }

      const focusableElements = Array.from(focusable);
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const focusElement = (element) => {
        if (element && typeof element.focus === 'function') {
          element.focus();
        }
      };

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          focusElement(last);
        }
      } else if (document.activeElement === last) {
        event.preventDefault();
        focusElement(first);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    node.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      node.removeEventListener('keydown', handleKeyDown);
    };
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

  const handleInputKeyDown = (e) => {
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
      ref={dialogRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white"
      role="dialog"
      aria-modal="true"
      aria-labelledby="window-switcher-title"
    >
      <div className="bg-ub-grey p-4 rounded w-3/4 md:w-1/3">
        <h2 id="window-switcher-title" className="sr-only">
          Window switcher
        </h2>
        <label htmlFor="window-switcher-search" className="sr-only">
          Search windows
        </label>
        <input
          id="window-switcher-search"
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleInputKeyDown}
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

