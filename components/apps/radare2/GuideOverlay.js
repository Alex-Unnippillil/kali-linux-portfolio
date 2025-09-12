import React, { useRef, useState } from 'react';
import useFocusTrap from '../../../hooks/useFocusTrap';

const STORAGE_KEY = 'r2HelpDismissed';

const STEPS = [
  'S1: Open the demo binary with \'r2 -A demo.bin\'.',
  'S2: Seek to the main function using \"s main\".',
  'S3: Disassemble with \"pdf @ main\" to view instructions.',
  'S4: List strings using \"iz\".',
  'S5: Close this tutorial and explore further.',
];

export default function GuideOverlay({ onClose }) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const containerRef = useRef(null);
  useFocusTrap(containerRef, true);

  const handleClose = () => {
    if (dontShow) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        /* ignore storage errors */
      }
    }
    onClose();
  };

  const prev = () => setStep((s) => Math.max(0, s - 1));
  const next = () => setStep((s) => Math.min(STEPS.length - 1, s + 1));

  const onKeyDown = (e) => {
    if (e.key === 'Escape') handleClose();
    if (e.key === 'ArrowRight') next();
    if (e.key === 'ArrowLeft') prev();
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      onKeyDown={onKeyDown}
      className="absolute inset-0 bg-black bg-opacity-75 text-white flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
    >
      <div className="max-w-md p-4 bg-gray-800 rounded shadow-lg">
        <h2 className="text-xl font-bold mb-2">Radare2 Tutorial</h2>
        <p className="mb-4">{STEPS[step]}</p>
        <div className="flex justify-between mb-4">
          <button
            type="button"
            onClick={prev}
            disabled={step === 0}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50 focus:outline-none focus:ring"
          >
            Prev
          </button>
          <span>{step + 1} / {STEPS.length}</span>
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
            aria-label="Don't show again"
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
          />
          <span>Don&apos;t show again</span>
        </label>
        <div className="mt-4 flex justify-between">
          <a
            href="/demo-data/radare2/tutorial/basic.r2"
            className="underline"
            target="_blank"
            rel="noreferrer"
          >
            View script
          </a>
          <button
            onClick={handleClose}
            className="px-3 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
