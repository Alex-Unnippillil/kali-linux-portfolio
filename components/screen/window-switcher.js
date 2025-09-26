import React, { useEffect, useState, useRef } from 'react';

const MAX_VISIBLE_WORKSPACES = 4;

export default function WindowSwitcher({
  windows = [],
  onSelect,
  onClose,
  workspaces = [],
  activeWorkspaceId,
  onWorkspaceSelect,
}) {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [visibleStart, setVisibleStart] = useState(0);
  const inputRef = useRef(null);

  const filtered = windows.filter((w) =>
    w.title.toLowerCase().includes(query.toLowerCase())
  );

  const hasOverflow = workspaces.length > MAX_VISIBLE_WORKSPACES;
  const resolvedActiveId =
    activeWorkspaceId || workspaces[0]?.id || null;
  const visibleWorkspaces = hasOverflow
    ? workspaces.slice(visibleStart, visibleStart + MAX_VISIBLE_WORKSPACES)
    : workspaces;

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!hasOverflow) {
      if (visibleStart !== 0) setVisibleStart(0);
      return;
    }
    const activeIndex = workspaces.findIndex(
      (ws) => ws.id === resolvedActiveId,
    );
    if (activeIndex === -1) return;
    let nextStart = visibleStart;
    if (activeIndex < visibleStart) {
      nextStart = activeIndex;
    } else if (activeIndex >= visibleStart + MAX_VISIBLE_WORKSPACES) {
      nextStart = activeIndex - MAX_VISIBLE_WORKSPACES + 1;
    }
    const maxStart = Math.max(0, workspaces.length - MAX_VISIBLE_WORKSPACES);
    nextStart = Math.min(Math.max(nextStart, 0), maxStart);
    if (nextStart !== visibleStart) {
      setVisibleStart(nextStart);
    }
  }, [hasOverflow, visibleStart, workspaces, resolvedActiveId]);

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

  const handleWorkspaceClick = (workspaceId) => {
    if (typeof onWorkspaceSelect === 'function') {
      onWorkspaceSelect(workspaceId);
    }
  };

  const handlePrev = () => {
    setVisibleStart((start) => Math.max(0, start - 1));
  };

  const handleNext = () => {
    const maxStart = Math.max(0, workspaces.length - MAX_VISIBLE_WORKSPACES);
    setVisibleStart((start) => Math.min(maxStart, start + 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 text-white">
      <div className="bg-ub-grey p-4 rounded w-3/4 md:w-1/3">
        {workspaces.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-2">
              {hasOverflow && (
                <button
                  type="button"
                  className="px-2 py-1 bg-black bg-opacity-30 rounded disabled:opacity-40"
                  onClick={handlePrev}
                  disabled={visibleStart === 0}
                  aria-label="Previous workspace"
                >
                  ‹
                </button>
              )}
              <div
                className={
                  hasOverflow
                    ? 'flex-1 overflow-hidden'
                    : 'flex-1'
                }
              >
                <div className="flex gap-2">
                  {visibleWorkspaces.map((ws) => (
                    <button
                      key={ws.id}
                      type="button"
                      onClick={() => handleWorkspaceClick(ws.id)}
                      className={`px-2 py-1 rounded transition-colors ${
                        ws.id === resolvedActiveId
                          ? 'bg-ub-orange text-black'
                          : 'bg-black bg-opacity-30 hover:bg-opacity-50'
                      }`}
                    >
                      {ws.name}
                    </button>
                  ))}
                </div>
              </div>
              {hasOverflow && (
                <button
                  type="button"
                  className="px-2 py-1 bg-black bg-opacity-30 rounded disabled:opacity-40"
                  onClick={handleNext}
                  disabled={visibleStart >= workspaces.length - MAX_VISIBLE_WORKSPACES}
                  aria-label="Next workspace"
                >
                  ›
                </button>
              )}
            </div>
          </div>
        )}
        <input
          ref={inputRef}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          className="w-full mb-4 px-2 py-1 rounded bg-black bg-opacity-20 focus:outline-none"
          placeholder="Search windows"
          aria-label="Search windows"
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

