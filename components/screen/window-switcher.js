import React, { useEffect, useState, useRef } from 'react';

const sanitizeIcon = (icon) => {
  if (typeof icon !== 'string' || icon.length === 0) return null;
  return icon.startsWith('./') ? icon.replace('./', '/') : icon;
};

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const filtered = windows.filter((w) => {
    const title = typeof w?.title === 'string' ? w.title : '';
    return title.toLowerCase().includes(query.toLowerCase());
  });

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!filtered.length && selected !== 0) {
      setSelected(0);
    } else if (selected >= filtered.length && filtered.length) {
      setSelected(0);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-11/12 max-w-lg rounded-lg border border-black/20 bg-white/95 p-4 text-kali-text shadow-2xl dark:border-white/10 dark:bg-ub-grey dark:text-white md:w-1/3">
        <label htmlFor="window-switcher-search" className="sr-only">
          Search windows
        </label>
        <input
          ref={inputRef}
          id="window-switcher-search"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="mb-4 w-full rounded-md border border-black/10 bg-white/40 px-3 py-2 text-sm text-kali-text placeholder:text-kali-muted focus:border-kali-focus focus:outline-none focus:ring-2 focus:ring-kali-focus dark:border-white/10 dark:bg-black/40 dark:text-white dark:placeholder:text-gray-300"
          placeholder="Search windows"
          aria-label="Search windows"
        />
        <ul role="listbox" aria-label="Open windows" className="space-y-2">
          {filtered.map((w, i) => {
            const isSelected = i === selected;
            const iconSrc = sanitizeIcon(w.icon);
            const fallbackInitial = typeof w?.title === 'string' && w.title.length
              ? w.title.charAt(0).toUpperCase()
              : '?';
            return (
              <li
                key={w.id}
                id={`window-switcher-item-${w.id}`}
                role="option"
                aria-selected={isSelected}
                className={`group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                  isSelected
                    ? 'bg-ub-orange text-black shadow-lg dark:text-black'
                    : 'bg-white/30 text-kali-text hover:bg-white/50 dark:bg-black/40 dark:text-white dark:hover:bg-black/60'
                }`}
                onMouseEnter={() => setSelected(i)}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  if (typeof onSelect === 'function') {
                    onSelect(w.id);
                  }
                }}
              >
                {iconSrc ? (
                  <img
                    src={iconSrc}
                    alt={`${w.title} icon`}
                    className="h-9 w-9 flex-shrink-0 rounded-md border border-black/10 bg-white/70 object-contain p-1 dark:border-white/10 dark:bg-black/40"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md border border-dashed border-black/20 bg-white/50 text-base font-semibold text-kali-text dark:border-white/20 dark:bg-black/40 dark:text-white"
                  >
                    {fallbackInitial}
                  </span>
                )}
                <span className="flex-1 truncate font-medium" title={w.title}>
                  {w.title}
                </span>
              </li>
            );
          })}
          {!filtered.length && (
            <li
              role="option"
              aria-disabled="true"
              className="rounded-md bg-white/30 px-3 py-2 text-sm text-kali-muted dark:bg-black/40 dark:text-gray-300"
            >
              No windows match your search.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}

