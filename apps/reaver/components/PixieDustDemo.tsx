import React, { useCallback, useEffect, useRef, useState } from 'react';

export type PixieStepStatus = 'pending' | 'running' | 'done';

export interface PixieStepDefinition {
  title: string;
  description: string;
  duration: number;
}

export const PIXIE_STEPS: PixieStepDefinition[] = [
  {
    title: 'Capture handshake material',
    description:
      'Monitor the target channel and cache WPS M1/M2 exchanges for offline work.',
    duration: 2200,
  },
  {
    title: 'Derive nonces and keys',
    description:
      'Extract the enrollee nonce, public key, and hashes needed for Pixie Dust analysis.',
    duration: 2600,
  },
  {
    title: 'Recover PIN offline',
    description:
      'Brute-force the weak PRNG seeded PIN space without touching the access point.',
    duration: 2400,
  },
];

const PROGRESS_TICK = 50;
export const PIXIE_STEP_DELAY = 400;

interface PixieDustDemoProps {
  onCancel: () => void;
  onComplete?: () => void;
}

interface StepState {
  progress: number;
  status: PixieStepStatus;
}

const createInitialState = (): StepState[] =>
  PIXIE_STEPS.map(() => ({ progress: 0, status: 'pending' as PixieStepStatus }));

const PixieDustDemo: React.FC<PixieDustDemoProps> = ({ onCancel, onComplete }) => {
  const [steps, setSteps] = useState<StepState[]>(createInitialState);
  const [status, setStatus] = useState<'running' | 'complete'>('running');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const delayRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef(false);

  const cleanup = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (delayRef.current) {
      clearTimeout(delayRef.current);
      delayRef.current = null;
    }
  }, []);

  const startStep = useCallback(
    (index: number) => {
      if (cancelledRef.current) return;
      if (index >= PIXIE_STEPS.length) {
        setStatus('complete');
        return;
      }

      setSteps((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], status: 'running' };
        return next;
      });

      const duration = PIXIE_STEPS[index].duration;
      let elapsed = 0;

      cleanup();
      intervalRef.current = setInterval(() => {
        if (cancelledRef.current) {
          cleanup();
          return;
        }

        elapsed += PROGRESS_TICK;
        const progress = Math.min(100, Math.round((elapsed / duration) * 100));

        setSteps((prev) => {
          const next = [...prev];
          next[index] = { ...next[index], progress };
          return next;
        });

        if (progress >= 100) {
          cleanup();
          setSteps((prev) => {
            const next = [...prev];
            next[index] = { ...next[index], progress: 100, status: 'done' };
            return next;
          });

          if (index + 1 >= PIXIE_STEPS.length) {
            setStatus('complete');
            return;
          }

          delayRef.current = setTimeout(() => {
            delayRef.current = null;
            startStep(index + 1);
          }, PIXIE_STEP_DELAY);
        }
      }, PROGRESS_TICK);
    },
    [cleanup]
  );

  useEffect(() => {
    cancelledRef.current = false;
    setSteps(createInitialState());
    setStatus('running');
    startStep(0);

    return () => {
      cancelledRef.current = true;
      cleanup();
    };
  }, [cleanup, startStep]);

  useEffect(() => {
    if (status === 'complete') {
      cleanup();
      onComplete?.();
    }
  }, [cleanup, onComplete, status]);

  const handleCancel = () => {
    cancelledRef.current = true;
    cleanup();
    onCancel();
  };

  const statusBadge = (stepStatus: PixieStepStatus) => {
    switch (stepStatus) {
      case 'done':
        return 'bg-green-500 text-black';
      case 'running':
        return 'bg-blue-500 text-white animate-pulse';
      default:
        return 'bg-gray-700 text-gray-300';
    }
  };

  return (
    <div
      data-testid="pixie-dust-demo"
      className="p-4 bg-gray-800 rounded border border-blue-500 text-sm"
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-lg font-semibold">Pixie Dust Guided Demo</h3>
          <p className="text-xs text-gray-300">
            Offline WPS attack walkthrough. Animations show each stage completing in order.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCancel}
          className="px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs"
        >
          Cancel demo
        </button>
      </div>
      <ol className="space-y-3" aria-live="polite">
        {PIXIE_STEPS.map((step, index) => {
          const state = steps[index];
          return (
            <li key={step.title} className="p-3 bg-gray-900 rounded">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{step.title}</span>
                <span
                  className={`px-2 py-0.5 rounded text-[0.65rem] ${statusBadge(state.status)}`}
                  data-testid={`pixie-status-${index}`}
                >
                  {state.status === 'pending'
                    ? 'Waiting'
                    : state.status === 'running'
                    ? 'Running'
                    : 'Complete'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">{step.description}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-gray-700 rounded overflow-hidden">
                  <div
                    className={`h-2 ${
                      state.status === 'done'
                        ? 'bg-green-500'
                        : state.status === 'running'
                        ? 'bg-blue-400'
                        : 'bg-gray-600'
                    } transition-all duration-75`}
                    style={{ width: `${state.progress}%` }}
                    data-testid={`pixie-progress-${index}`}
                  />
                </div>
                <span
                  className="w-12 text-right font-mono text-xs"
                  aria-label={`${step.title} progress`}
                >
                  {state.progress}%
                </span>
              </div>
            </li>
          );
        })}
      </ol>
      {status === 'complete' && (
        <div className="mt-4 p-3 bg-gray-900 rounded border border-green-500" role="status">
          <h4 className="text-sm font-semibold mb-1">Offline key recovered</h4>
          <p className="text-xs text-gray-300 mb-3">
            The Pixie Dust demo completed using captured handshake data. In the real attack,
            no further interaction with the access point would be needed.
          </p>
          <button
            type="button"
            onClick={handleCancel}
            className="px-3 py-1 bg-green-600 hover:bg-green-500 rounded text-xs text-black"
          >
            Back to AP list
          </button>
        </div>
      )}
    </div>
  );
};

export default PixieDustDemo;
