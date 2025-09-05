"use client";

import { useState, useEffect, useCallback } from 'react';
import usePersistentState from '../../hooks/usePersistentState';

const LAYOUTS = ['EN', 'DE', 'FR'];

export default function KeyboardLayoutIndicator() {
  const [layout, setLayout] = usePersistentState('keyboard-layout', LAYOUTS[0]);
  const [perWindow, setPerWindow] = usePersistentState('keyboard-layout-per-window', false);
  const [open, setOpen] = useState(false);

  const cycleLayout = useCallback(() => {
    const currentIndex = LAYOUTS.indexOf(layout);
    const nextLayout = LAYOUTS[(currentIndex + 1) % LAYOUTS.length];
    setLayout(nextLayout);
  }, [layout, setLayout]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.altKey && e.shiftKey && e.code === 'Space') {
        e.preventDefault();
        cycleLayout();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [cycleLayout]);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        aria-label={`Keyboard layout: ${layout}`}
        className="px-2 py-1 text-xs text-white focus:outline-none"
        onClick={() => setOpen(!open)}
      >
        {layout}
      </button>
      {open && (
        <div className="absolute right-0 mt-1 bg-ub-cool-grey rounded-md shadow border border-black border-opacity-20 z-50">
          {LAYOUTS.map((l) => (
            <button
              key={l}
              type="button"
              className={`block w-full text-left px-4 py-2 hover:bg-white hover:bg-opacity-10 ${l === layout ? 'font-bold' : ''}`}
              onClick={() => {
                setLayout(l);
                setOpen(false);
              }}
            >
              {l}
            </button>
          ))}
          <div className="px-4 py-2 border-t border-black border-opacity-20 flex justify-between items-center">
            <span>Per-window</span>
            <input
              type="checkbox"
              aria-label="Per-window"
              checked={perWindow}
              onChange={() => setPerWindow(!perWindow)}
            />
          </div>
          <button
            type="button"
            className="block w-full text-left px-4 py-2 border-t border-black border-opacity-20 hover:bg-white hover:bg-opacity-10"
            onClick={() => {
              cycleLayout();
              setOpen(false);
            }}
          >
            Cycle Layout
          </button>
        </div>
      )}
    </div>
  );
}

