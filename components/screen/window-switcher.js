import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const filteredRef = useRef([]);
  const selectedRef = useRef(0);
  const closedRef = useRef(false);

  const filtered = useMemo(
    () => windows.filter((w) => w.title.toLowerCase().includes(query.toLowerCase())),
    [windows, query]
  );

  filteredRef.current = filtered;

  useEffect(() => {
    const len = filtered.length;
    if (!len && selected !== 0) {
      setSelected(0);
      selectedRef.current = 0;
      return;
    }
    if (len && selected >= len) {
      const next = len - 1;
      setSelected(next);
      selectedRef.current = next;
    }
  }, [filtered, selected]);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    closedRef.current = false;
    inputRef.current?.focus();
    return () => {
      closedRef.current = true;
    };
  }, []);

  const close = useCallback(() => {
    if (closedRef.current) return;
    closedRef.current = true;
    setQuery('');
    setSelected(0);
    selectedRef.current = 0;
    if (typeof onClose === 'function') {
      onClose();
    }
  }, [onClose]);

  const commitSelection = useCallback(() => {
    if (closedRef.current) return;
    const current = filteredRef.current;
    const win = current[selectedRef.current];
    closedRef.current = true;
    setQuery('');
    setSelected(0);
    selectedRef.current = 0;
    if (win && typeof onSelect === 'function') {
      onSelect(win.id);
    } else if (typeof onClose === 'function') {
      onClose();
    }
  }, [onSelect, onClose]);

  const updateSelected = useCallback((updater) => {
    setSelected((prev) => {
      const len = filteredRef.current.length;
      const next = updater(prev, len);
      selectedRef.current = next;
      return next;
    });
  }, []);

  const cycleSelection = useCallback(
    (direction) => {
      updateSelected((prev, len) => {
        if (!len) return 0;
        return (prev + direction + len) % len;
      });
    },
    [updateSelected]
  );

  const moveSelection = useCallback(
    (direction) => {
      updateSelected((prev, len) => {
        if (!len) return 0;
        const next = prev + direction;
        if (next < 0) return len - 1;
        if (next >= len) return 0;
        return next;
      });
    },
    [updateSelected]
  );

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (closedRef.current) return;

      if (e.key === 'Alt') {
        return;
      }

      if (e.key === 'Escape') {
        e.preventDefault();
        close();
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        cycleSelection(e.shiftKey ? -1 : 1);
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        moveSelection(1);
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        moveSelection(-1);
        return;
      }

      if (e.altKey && (e.key === 'Backspace' || e.key === 'Delete')) {
        e.preventDefault();
        setQuery((prev) => prev.slice(0, -1));
        updateSelected(() => 0);
        return;
      }

      if (e.altKey && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        const nextChar = e.key === ' ' ? ' ' : e.key;
        setQuery((prev) => `${prev}${nextChar}`);
        updateSelected(() => 0);
      }
    };

    const handleKeyUp = (e) => {
      if (closedRef.current) return;
      if (e.key === 'Alt') {
        e.preventDefault();
        commitSelection();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [close, cycleSelection, moveSelection, commitSelection, updateSelected]);

  const handleChange = (e) => {
    setQuery(e.target.value);
    updateSelected(() => 0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="bg-ub-grey p-4 rounded w-3/4 md:w-1/3">
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          aria-label="Search windows"
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
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

