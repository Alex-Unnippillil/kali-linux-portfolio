import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ALT_KEYS = new Set(['Alt', 'AltGraph']);

const getColumnCount = (count) => {
  if (count <= 1) return 1;
  const ideal = Math.ceil(Math.sqrt(count));
  return Math.min(6, Math.max(1, ideal));
};

export default function WindowSwitcher({ windows = [], onSelect, onClose }) {
  const [selected, setSelected] = useState(0);
  const containerRef = useRef(null);
  const selectedRef = useRef(selected);
  const windowsRef = useRef(windows);

  const columnCount = useMemo(
    () => getColumnCount(windows.length || 1),
    [windows.length]
  );

  const totalRows = useMemo(
    () => Math.ceil((windows.length || 1) / columnCount),
    [windows.length, columnCount]
  );

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    windowsRef.current = windows;
    if (!windows.length) {
      setSelected(0);
      return;
    }
    setSelected((prev) => {
      if (prev < windows.length) return prev;
      return windows.length - 1;
    });
  }, [windows]);

  useEffect(() => {
    containerRef.current?.focus({ preventScroll: true });
  }, []);

  useEffect(() => {
    const preventScroll = (event) => {
      event.preventDefault();
    };
    window.addEventListener('wheel', preventScroll, { passive: false });
    return () => {
      window.removeEventListener('wheel', preventScroll);
    };
  }, []);

  const moveSelection = useCallback(
    (direction) => {
      const count = windowsRef.current.length;
      if (!count) return;
      setSelected((current) => {
        const col = columnCount;
        const rowIndex = Math.floor(current / col);
        const colIndex = current % col;
        const rowCount = totalRows;

        if (direction === 'left') {
          return (current - 1 + count) % count;
        }
        if (direction === 'right') {
          return (current + 1) % count;
        }
        if (direction === 'up') {
          if (current - col >= 0) {
            return current - col;
          }
          const lastRowStart = Math.floor((count - 1) / col) * col;
          const lastRowSize = count - lastRowStart;
          const safeCol = Math.min(colIndex, Math.max(lastRowSize - 1, 0));
          return lastRowStart + safeCol;
        }
        if (direction === 'down') {
          const nextIndex = current + col;
          if (nextIndex < count) {
            const nextRow = Math.floor(nextIndex / col);
            const nextRowSize = Math.min(col, count - nextRow * col);
            const safeCol = Math.min(colIndex, nextRowSize - 1);
            return nextRow * col + safeCol;
          }
          const isBottomRow = rowIndex === rowCount - 1;
          if (!isBottomRow) {
            const nextRowStart = (rowIndex + 1) * col;
            const nextRowSize = Math.min(col, count - nextRowStart);
            const safeCol = Math.min(colIndex, Math.max(nextRowSize - 1, 0));
            return nextRowStart + safeCol;
          }
          const topRowSize = Math.min(col, count);
          const safeCol = Math.min(colIndex, Math.max(topRowSize - 1, 0));
          return safeCol;
        }
        return current;
      });
    },
    [columnCount, totalRows]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (ALT_KEYS.has(event.key)) {
        event.preventDefault();
        return;
      }
      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault();
          moveSelection('left');
          break;
        case 'ArrowRight':
          event.preventDefault();
          moveSelection('right');
          break;
        case 'ArrowUp':
          event.preventDefault();
          moveSelection('up');
          break;
        case 'ArrowDown':
          event.preventDefault();
          moveSelection('down');
          break;
        case 'Tab':
          event.preventDefault();
          moveSelection(event.shiftKey ? 'left' : 'right');
          break;
        case 'Escape':
          event.preventDefault();
          if (typeof onClose === 'function') {
            onClose();
          }
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (event) => {
      if (!ALT_KEYS.has(event.key)) return;
      event.preventDefault();
      const list = windowsRef.current;
      const index = selectedRef.current;
      const chosen = list[index];
      if (chosen && typeof onSelect === 'function') {
        onSelect(chosen.id);
      } else if (typeof onClose === 'function') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [moveSelection, onClose, onSelect]);

  if (!windows.length) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 text-white">
      <div
        ref={containerRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        className="pointer-events-auto focus:outline-none"
      >
        <div className="rounded-xl bg-ub-grey/95 p-6 shadow-2xl">
          <div
            className="grid gap-4"
            style={{
              gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
            }}
          >
            {windows.map((win, index) => {
              const isActive = index === selected;
              return (
                <div
                  key={win.id}
                  className={`flex flex-col items-center justify-center rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-center transition-colors ${
                    isActive
                      ? 'ring-2 ring-offset-2 ring-offset-transparent ring-ub-orange bg-white/10'
                      : 'opacity-80'
                  }`}
                  aria-selected={isActive}
                >
                  <div className="mb-2 flex h-16 w-16 items-center justify-center rounded-md bg-black/30">
                    {win.icon ? (
                      <img
                        src={win.icon}
                        alt=""
                        className="h-12 w-12 object-contain"
                        draggable={false}
                      />
                    ) : (
                      <span className="text-lg font-semibold">{win.title[0]}</span>
                    )}
                  </div>
                  <span className="text-sm font-medium leading-tight">{win.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
