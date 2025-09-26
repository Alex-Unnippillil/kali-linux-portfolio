import React, { useEffect } from 'react';

const FALLBACK_ICON = '/themes/Yaru/status/about.svg';

export default function WindowSwitcher({
  windows = [],
  selectedIndex = 0,
  onCycle,
  onSelect,
  onClose,
  onHighlight,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        onCycle?.(1);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onCycle?.(-1);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const win = windows[selectedIndex];
        if (win) {
          onSelect?.(win);
        }
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'Alt') {
        const win = windows[selectedIndex];
        if (win) {
          onSelect?.(win);
        } else {
          onClose?.();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [windows, selectedIndex, onCycle, onSelect, onClose]);

  if (!windows.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur"
      role="presentation"
      aria-hidden="false"
    >
      <div className="max-w-5xl w-full px-6">
        <div
          className="flex justify-center gap-6 overflow-x-auto py-8"
          role="listbox"
          aria-label="Open windows"
        >
          {windows.map((win, index) => {
            const isActive = index === selectedIndex;
            const preview = win.preview || win.thumbnail || win.icon || FALLBACK_ICON;
            return (
              <button
                key={`${win.id}-${index}`}
                type="button"
                className={`flex w-40 flex-col items-center rounded-2xl px-4 py-5 transition-all duration-150 focus:outline-none focus-visible:ring-4 focus-visible:ring-ub-orange/80 ${
                  isActive
                    ? 'scale-105 bg-white text-ub-cool-grey shadow-2xl ring-4 ring-ub-orange/80'
                    : 'bg-white/10 text-white/80 hover:bg-white/20'
                }`}
                onMouseEnter={() => onHighlight?.(index)}
                onFocus={() => onHighlight?.(index)}
                onClick={() => onSelect?.(win)}
                role="option"
                aria-selected={isActive}
                title={win.title}
              >
                <div className={`flex h-24 w-full items-center justify-center overflow-hidden rounded-xl ${isActive ? 'bg-white/90' : 'bg-white/5'}`}>
                  <img
                    src={preview}
                    alt={win.title}
                    className="h-20 w-20 object-contain"
                    draggable={false}
                  />
                </div>
                <span className="mt-3 w-full truncate text-center text-sm font-medium">{win.title}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

