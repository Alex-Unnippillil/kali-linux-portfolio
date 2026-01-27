import React, { useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'r2HelpDismissed';

const STEPS = [
  'S1: This is a simulated Radare2 workspace. All data is local and deterministic.',
  'S2: Use the Disassembly tab to browse instructions and set bookmarks.',
  'S3: Open Hex to edit bytes inline and track patches in the ledger.',
  'S4: Explore Strings and Xrefs to jump between addresses.',
  'S5: Record notes for later review in the Notes tab.',
];

export default function GuideOverlay({ onClose }) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const containerRef = useRef(null);
  const firstFocusableRef = useRef(null);
  const lastFocusableRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      previousFocusRef.current = document.activeElement;
    }
    firstFocusableRef.current?.focus();
  }, []);

  const handleClose = () => {
    if (dontShow) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        /* ignore storage errors */
      }
    }
    if (previousFocusRef.current && previousFocusRef.current.focus) {
      previousFocusRef.current.focus();
    }
    onClose();
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
    }
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
    if (e.key === 'Tab') {
      const focusable = [
        firstFocusableRef.current,
        lastFocusableRef.current,
      ].filter(Boolean);
      if (focusable.length === 0) return;
      const [first, last] = focusable;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
      className="absolute inset-0 bg-black bg-opacity-75 text-white flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="r2-guide-title"
    >
      <div className="max-w-md p-4 bg-gray-800 rounded shadow-lg space-y-4">
        <div>
          <h2 id="r2-guide-title" className="text-xl font-bold mb-2">
            Radare2 Tutorial
          </h2>
          <p className="mb-2">{STEPS[step]}</p>
          <p className="text-xs opacity-75">Simulation only. No real binaries.</p>
        </div>
        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            ref={firstFocusableRef}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50 focus:outline-none focus:ring"
          >
            Prev
          </button>
          <span>
            {step + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={next}
            disabled={step === STEPS.length - 1}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50 focus:outline-none focus:ring"
          >
            Next
          </button>
        </div>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
          />
          <span>Don&apos;t show again</span>
        </label>
        <div className="flex justify-end">
          <button
            onClick={handleClose}
            ref={lastFocusableRef}
            className="px-3 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
