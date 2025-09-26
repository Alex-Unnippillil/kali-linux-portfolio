'use client';

import React, { useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';

const normalizeIcon = (icon) => {
  if (!icon) return null;
  return icon.startsWith('./') ? icon.replace('./', '/') : icon;
};

const WindowSwitcher = ({
  windows = [],
  selectedIndex = 0,
  onSelect,
  onHover,
  onClose,
}) => {
  const containerRef = useRef(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const selected = windows[selectedIndex] ?? null;

  useEffect(() => {
    const node = containerRef.current;
    if (node) {
      node.focus();
    }
  }, [windows.length]);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      } else if (event.key === 'Enter' && selected) {
        event.preventDefault();
        onSelect?.(selected.id);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onSelect, selected]);

  const itemClass = useMemo(
    () =>
      prefersReducedMotion
        ? 'group flex flex-col rounded-lg border border-transparent bg-white/10 p-3 text-white focus:outline-none'
        : 'group flex flex-col rounded-lg border border-transparent bg-white/10 p-3 text-white shadow-sm transition-transform duration-150 ease-out focus:outline-none hover:scale-[1.02] hover:border-orange-300/40',
    [prefersReducedMotion],
  );

  if (!windows.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70"
      role="dialog"
      aria-modal="true"
      aria-label="Switch between open windows"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose?.();
        }
      }}
    >
      <div
        ref={containerRef}
        role="listbox"
        tabIndex={-1}
        aria-activedescendant={selected ? `window-switcher-${selected.id}` : undefined}
        aria-describedby="window-switcher-help"
        className={`w-full max-w-4xl rounded-xl border border-white/10 bg-neutral-900/90 p-6 shadow-2xl outline-none ${
          prefersReducedMotion ? '' : 'backdrop-blur-md'
        }`}
      >
        <p id="window-switcher-help" className="sr-only">
          Use Tab or Shift plus Tab to change the highlighted window. Release Alt or press Enter to activate.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {windows.map((win, index) => {
            const isSelected = index === selectedIndex;
            const icon = normalizeIcon(win.icon);
            return (
              <button
                key={win.id}
                type="button"
                id={`window-switcher-${win.id}`}
                role="option"
                aria-selected={isSelected}
                className={`${itemClass} ${
                  isSelected
                    ? 'border-orange-400/80 bg-orange-500/20 shadow-lg'
                    : 'hover:border-orange-300/40'
                }`}
                onMouseEnter={() => onHover?.(index)}
                onFocus={() => onHover?.(index)}
                onClick={() => onSelect?.(win.id)}
              >
                <div
                  className={`mb-3 h-32 w-full overflow-hidden rounded-md border border-white/10 bg-neutral-950/60 ${
                    prefersReducedMotion ? '' : 'transition-colors duration-200 ease-out group-hover:border-orange-300/50'
                  }`}
                >
                  {win.preview ? (
                    <img
                      src={win.preview}
                      alt={`Preview of ${win.title}`}
                      className="h-full w-full object-cover"
                    />
                  ) : icon ? (
                    <div className="flex h-full w-full items-center justify-center bg-neutral-900/80">
                      <Image
                        src={icon}
                        alt=""
                        width={64}
                        height={64}
                        className="h-16 w-16"
                      />
                    </div>
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-sm text-white/60">
                      No preview available
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between text-left">
                  <span className="text-sm font-medium text-white">{win.title}</span>
                  {win.isMinimized && (
                    <span className="text-xs uppercase tracking-wide text-white/60">Minimized</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WindowSwitcher;
