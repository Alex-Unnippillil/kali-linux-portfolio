import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { getAppMetadata } from '../../data/appMetadata';

const SPECIAL_KEYS = new Set(['Tab', 'ArrowDown', 'ArrowUp']);

const escapeRegExp = (str = '') => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const highlightMatches = (text, tokens) => {
  if (!tokens.length || !text) return text;
  const escaped = tokens.map(escapeRegExp).join('|');
  if (!escaped) return text;
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = text.split(regex);
  const tokenSet = new Set(tokens.map((token) => token.toLowerCase()));

  return parts
    .filter((part) => part !== '')
    .map((part, index) => {
      const key = `${part}-${index}`;
      if (tokenSet.has(part.toLowerCase())) {
        return (
          <mark key={key} className="rounded bg-ub-orange px-1 text-black">
            {part}
          </mark>
        );
      }
      return (
        <React.Fragment key={key}>{part}</React.Fragment>
      );
    });
};

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef(null);

  const tokens = useMemo(
    () =>
      query
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .filter(Boolean),
    [query]
  );

  const enrichedWindows = useMemo(
    () =>
      windows.map((w) => {
        const meta = getAppMetadata(w.id);
        const tags = Array.isArray(meta?.tags) ? meta.tags : [];
        return { ...w, tags };
      }),
    [windows]
  );

  const filtered = useMemo(() => {
    if (!tokens.length) return enrichedWindows;
    return enrichedWindows.filter((w) => {
      const haystack = `${w.title} ${w.tags.join(' ')}`.toLowerCase();
      return tokens.every((token) => haystack.includes(token));
    });
  }, [enrichedWindows, tokens]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleClose = useCallback(() => {
    setQuery('');
    setSelected(0);
    if (typeof onClose === 'function') onClose();
  }, [onClose]);

  useEffect(() => {
    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        const win = filtered[selected];
        if (win && typeof onSelect === 'function') {
          onSelect(win.id);
        } else {
          handleClose();
        }
      }
    };
    window.addEventListener('keyup', handleKeyUp);
    return () => window.removeEventListener('keyup', handleKeyUp);
  }, [filtered, selected, onSelect, handleClose]);

  useEffect(() => {
    const handleGlobalKey = (e) => {
      if (!inputRef.current) return;
      if (SPECIAL_KEYS.has(e.key)) return;
      if (document.activeElement === inputRef.current) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleClose();
        return;
      }

      if (e.key === 'Backspace') {
        e.preventDefault();
        setQuery((prev) => {
          const next = prev.slice(0, -1);
          if (next !== prev) setSelected(0);
          return next;
        });
        inputRef.current.focus();
        return;
      }

      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setQuery((prev) => {
          const next = `${prev}${e.key}`;
          setSelected(0);
          return next;
        });
        inputRef.current.focus();
      }
    };

    window.addEventListener('keydown', handleGlobalKey);
    return () => window.removeEventListener('keydown', handleGlobalKey);
  }, [handleClose]);

  useEffect(() => {
    if (selected >= filtered.length) {
      setSelected(filtered.length ? Math.min(selected, filtered.length - 1) : 0);
    }
  }, [filtered.length, selected]);

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
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const win = filtered[selected];
      if (win && typeof onSelect === 'function') {
        onSelect(win.id);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
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
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
          aria-label="Search open windows"
          placeholder="Search windows"
        />
        <ul>
          {filtered.map((w, i) => (
            <li
              key={w.id}
              className={`px-2 py-2 rounded transition-colors ${
                i === selected ? 'bg-ub-orange text-black' : 'hover:bg-white hover:bg-opacity-10'
              }`}
            >
              <div className="text-sm font-medium">
                {highlightMatches(w.title, tokens)}
              </div>
              {w.tags.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1 text-xs text-gray-200">
                  {w.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`rounded bg-white bg-opacity-10 px-2 py-0.5 ${
                        i === selected ? 'text-black' : ''
                      }`}
                    >
                      {highlightMatches(tag, tokens)}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

