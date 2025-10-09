import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';

export default function WindowSwitcher({
  windows = [],
  onSelect,
  onClose,
  onMinimizeWindow,
  onCloseWindow,
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  const filtered = useMemo(
    () =>
      windows.filter((w) =>
        w.title.toLowerCase().includes(query.toLowerCase())
      ),
    [windows, query]
  );

  const filteredLength = filtered.length;

  useEffect(() => {
    if (!filteredLength) {
      if (selected !== 0) {
        setSelected(0);
      }
    } else if (selected >= filteredLength) {
      setSelected(filteredLength - 1);
    }
  }, [filteredLength, selected]);

  const focusItemAtIndex = useCallback((index) => {
    if (!listRef.current) return;
    const button = listRef.current.querySelector(
      `[data-index="${index}"] [data-role="primary"]`
    );
    if (button) {
      button.focus();
    }
  }, []);

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

  const moveSelection = useCallback(
    (direction) => {
      const len = filtered.length;
      if (!len) return;
      const next = (selected + direction + len) % len;
      setSelected(next);
      focusItemAtIndex(next);
    },
    [filtered, focusItemAtIndex, selected]
  );

  const handleInputKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      if (typeof onClose === 'function') onClose();
    }
  };

  const handleListKeyDown = (e) => {
    if (e.target === inputRef.current) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveSelection(1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveSelection(-1);
    } else if (e.key === 'Escape' && typeof onClose === 'function') {
      e.preventDefault();
      onClose();
    }
  };

  const handleSelect = (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof onSelect === 'function') {
      onSelect(id);
    }
  };

  const handleMinimize = async (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof onMinimizeWindow === 'function') {
      await onMinimizeWindow(id);
    }
  };

  const handleCloseWindow = async (event, id) => {
    event.preventDefault();
    event.stopPropagation();
    if (typeof onCloseWindow === 'function') {
      await onCloseWindow(id);
    }
  };

  const handleChange = (e) => {
    setQuery(e.target.value);
    setSelected(0);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div
        className="bg-ub-grey p-4 rounded w-3/4 md:w-1/3"
        onKeyDown={handleListKeyDown}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleInputKeyDown}
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
          placeholder="Search windows"
        />
        <ul ref={listRef}>
          {filtered.map((w, i) => {
            const isSelected = i === selected;
            return (
              <li
                key={w.id}
                data-index={i}
                className={`px-2 py-1 rounded transition-colors ${
                  isSelected ? 'bg-ub-orange text-black' : 'hover:bg-white/10'
                }`}
                onMouseEnter={() => setSelected(i)}
              >
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    data-role="primary"
                    className={`flex-1 text-left focus:outline-none ${
                      isSelected ? 'text-black' : 'text-white'
                    }`}
                    onClick={(event) => handleSelect(event, w.id)}
                    onFocus={() => setSelected(i)}
                  >
                    {w.title}
                  </button>
                  <div className="flex flex-none items-center gap-1">
                    <button
                      type="button"
                      className="rounded bg-black/30 px-2 py-1 text-xs text-white transition hover:bg-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      onClick={(event) => handleMinimize(event, w.id)}
                      onFocus={() => setSelected(i)}
                      aria-label={`Minimize ${w.title}`}
                    >
                      _
                    </button>
                    <button
                      type="button"
                      className="rounded bg-black/30 px-2 py-1 text-xs text-white transition hover:bg-black/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/80"
                      onClick={(event) => handleCloseWindow(event, w.id)}
                      onFocus={() => setSelected(i)}
                      aria-label={`Close ${w.title}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

