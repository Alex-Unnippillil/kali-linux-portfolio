"use client";

import React, { useEffect, useRef } from 'react';

const keyIsForward = (key) => key === 'ArrowRight' || key === 'ArrowDown';
const keyIsBackward = (key) => key === 'ArrowLeft' || key === 'ArrowUp';

export default function WindowSwitcher({
  windows = [],
  selectedIndex = 0,
  previews = {},
  onSelect,
  onClose,
  onNavigate,
  onHighlight,
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    node?.focus();
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Tab') {
        event.preventDefault();
        onNavigate?.(event.shiftKey ? -1 : 1);
      } else if (keyIsForward(event.key)) {
        event.preventDefault();
        onNavigate?.(1);
      } else if (keyIsBackward(event.key)) {
        event.preventDefault();
        onNavigate?.(-1);
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        const target = windows[selectedIndex];
        if (target) {
          onSelect?.(target.id);
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [windows, selectedIndex, onNavigate, onSelect, onClose]);

  if (!windows.length) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Window switcher"
    >
      <div className="w-full max-w-5xl px-4 sm:px-8">
        <div
          ref={containerRef}
          tabIndex={-1}
          className="outline-none"
        >
          <div
            className="flex flex-wrap items-stretch justify-center gap-4 overflow-x-auto py-6"
            role="listbox"
            aria-label="Open windows"
          >
            {windows.map((win, index) => {
              const selected = index === selectedIndex;
              const label = win.title || win.id;
              const preview = previews?.[win.id];
              const icon = win.icon;
              const fallbackLetter = (label || '?').charAt(0).toUpperCase();

              return (
                <button
                  key={win.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => onSelect?.(win.id)}
                  onMouseEnter={() => onHighlight?.(index)}
                  onFocus={() => onHighlight?.(index)}
                  className={`group flex w-44 flex-col rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange ${
                    selected
                      ? 'border-ub-orange bg-white text-black shadow-lg'
                      : 'border-transparent bg-ub-grey bg-opacity-80 text-white shadow'
                  }`}
                  title={label}
                >
                  <div className={`relative m-3 mb-2 flex h-28 items-center justify-center overflow-hidden rounded-md border ${
                    selected ? 'border-black/30' : 'border-white/10'
                  } bg-black/60`}
                  >
                    {preview ? (
                      <img
                        src={preview}
                        alt=""
                        aria-hidden="true"
                        className="h-full w-full object-cover"
                      />
                    ) : icon ? (
                      <img
                        src={icon}
                        alt=""
                        aria-hidden="true"
                        className="h-12 w-12"
                      />
                    ) : (
                      <span className="flex h-12 w-12 items-center justify-center rounded bg-white/10 text-lg font-semibold">
                        {fallbackLetter}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-center gap-2 px-3 pb-4 text-sm font-medium">
                    {icon ? (
                      <img
                        src={icon}
                        alt=""
                        aria-hidden="true"
                        className="h-5 w-5"
                      />
                    ) : null}
                    <span className="truncate" aria-live={selected ? 'polite' : 'off'}>
                      {label}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-center text-xs text-gray-200">
            Hold Alt and press Tab, arrow keys, or click to switch windows. Press Escape to cancel.
          </p>
        </div>
      </div>
    </div>
  );
}
