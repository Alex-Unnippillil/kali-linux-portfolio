import React, { useEffect, useState } from 'react';

type PaneKey = 'functions' | 'cfg' | 'decompile' | 'hex';

interface DecompilerTourProps {
  targets: Record<PaneKey, React.RefObject<HTMLElement>>;
  onClose: () => void;
}

const steps: { key: PaneKey; text: string }[] = [
  { key: 'functions', text: 'Browse detected functions here.' },
  { key: 'cfg', text: 'The control flow graph visualizes branches.' },
  { key: 'decompile', text: 'Decompiled source for the selected function.' },
  { key: 'hex', text: 'Raw hexadecimal bytes of the function.' },
];

export default function DecompilerTour({ targets, onClose }: DecompilerTourProps) {
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    const t = steps[step];
    const el = targets[t.key]?.current;
    if (!el) return;
    const update = () => setRect(el.getBoundingClientRect());
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [step, targets]);

  if (!rect) return null;

  const { top, left, width, height } = rect;
  const message = steps[step].text;

  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />
      <div
        className="absolute border-2 border-yellow-400 pointer-events-none"
        style={{ top, left, width, height }}
      />
      <div
        className="absolute bg-gray-800 text-white p-4 rounded shadow-lg"
        style={{ top: top + height + 8, left }}
      >
        <p className="mb-2">{message}</p>
        <div className="text-right space-x-2">
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => {
              if (step > 0) setStep(step - 1);
              else onClose();
            }}
          >
            {step > 0 ? 'Back' : 'Close'}
          </button>
          <button
            className="px-2 py-1 bg-gray-700 rounded"
            onClick={() => {
              if (step < steps.length - 1) setStep(step + 1);
              else onClose();
            }}
          >
            {step < steps.length - 1 ? 'Next' : 'Done'}
          </button>
        </div>
      </div>
    </div>
  );
}

