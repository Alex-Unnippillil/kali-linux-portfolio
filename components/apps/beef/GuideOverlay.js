import React, { useEffect, useRef, useState } from 'react';
import useFocusTrap from '../../../hooks/useFocusTrap';

const STORAGE_KEY = 'beefHelpDismissed';

const STEPS = [
  'S1: Refresh to load demo hooks.',
  'S2: Select a hooked browser.',
  'S3: Pick a module from the list.',
  'S4: Run the chosen module.',
  'S5: Review the module output.',
  'S6: Inspect the hook/module graph.',
  'S7: Remember this is a safe demo.',
  'S8: Close the guide and explore.'
];

export default function GuideOverlay({ onClose }) {
  const [step, setStep] = useState(0);
  const [dontShow, setDontShow] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

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
      className="absolute inset-0 bg-black bg-opacity-75 text-white flex items-center justify-center z-50"
      role="dialog"
      aria-modal="true"
      tabIndex={-1}
      onKeyDown={onKeyDown}
    >
      <div className="max-w-md p-4 bg-gray-800 rounded shadow-lg">
        <div className="mb-2 text-center font-bold">
          Demo data, no live scanning
        </div>
        <h2 className="text-xl font-bold mb-2">BeEF Workflow</h2>
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
            checked={dontShow}
            onChange={(e) => setDontShow(e.target.checked)}
          />
          <span>Don&apos;t show again</span>
        </label>
        <button
          onClick={handleClose}
          className="mt-4 px-3 py-1 bg-gray-700 rounded focus:outline-none focus:ring"
        >
          Close
        </button>
      </div>
    </div>
  );
}
