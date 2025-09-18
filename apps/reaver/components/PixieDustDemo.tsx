import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import type { AccessPoint } from './APList';

type StepStatus = 'pending' | 'running' | 'ready' | 'completed';

interface PixieDustStep {
  id: string;
  title: string;
  description: string;
  narrative: string;
  duration: number;
}

export const PIXIE_DUST_STEPS: PixieDustStep[] = [
  {
    id: 'capture',
    title: 'Capture WPS Handshake',
    description:
      'Monitor the target for registrar exchanges and capture the M1/M2 handshake to extract seeds for offline work.',
    narrative: 'Handshake captured and saved for offline analysis.',
    duration: 2400,
  },
  {
    id: 'extract',
    title: 'Extract Nonces & Keys',
    description:
      'Derive the E-Nonce, R-Nonce, AuthKey and PSK1/PSK2 values from the captured frames. Weak PRNG values fall quickly.',
    narrative: 'Nonce pairs extracted. AuthKey weaknesses confirmed.',
    duration: 2600,
  },
  {
    id: 'crack',
    title: 'Offline PIN Analysis',
    description:
      'Use deterministic flaws to derive the WPS PIN without more traffic. Apply vendor heuristics and checksum validation.',
    narrative: 'Offline analysis recovered the registrar PIN instantly.',
    duration: 3200,
  },
];

export type PixieDustStatus = 'animating' | 'awaitingNext' | 'finished' | 'cancelled';

export interface PixieDustState {
  status: PixieDustStatus;
  stepIndex: number;
}

export type PixieDustEvent =
  | { type: 'ANIMATION_DONE' }
  | { type: 'NEXT' }
  | { type: 'CANCEL' };

export const pixieDustInitialState: PixieDustState = {
  status: 'animating',
  stepIndex: 0,
};

export const pixieDustReducer = (
  state: PixieDustState,
  event: PixieDustEvent
): PixieDustState => {
  switch (event.type) {
    case 'ANIMATION_DONE':
      if (state.status !== 'animating') {
        return state;
      }
      return { status: 'awaitingNext', stepIndex: state.stepIndex };
    case 'NEXT':
      if (state.status !== 'awaitingNext') {
        return state;
      }
      if (state.stepIndex >= PIXIE_DUST_STEPS.length - 1) {
        return { status: 'finished', stepIndex: state.stepIndex };
      }
      return { status: 'animating', stepIndex: state.stepIndex + 1 };
    case 'CANCEL':
      return { status: 'cancelled', stepIndex: state.stepIndex };
    default:
      return state;
  }
};

interface PixieDustDemoProps {
  ap: AccessPoint;
  onExit: () => void;
}

const PixieDustDemo: React.FC<PixieDustDemoProps> = ({ ap, onExit }) => {
  const [state, dispatch] = useReducer(pixieDustReducer, pixieDustInitialState);
  const [progress, setProgress] = useState(0);
  const [log, setLog] = useState<string[]>([]);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const narratedStepsRef = useRef(new Set<number>());
  const completionLoggedRef = useRef(false);

  const stopTimers = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      stopTimers();
    },
    [stopTimers]
  );

  useEffect(() => {
    if (state.status !== 'animating') {
      return;
    }

    stopTimers();
    setProgress(0);

    const step = PIXIE_DUST_STEPS[state.stepIndex];
    const start = Date.now();
    const duration = Math.max(step.duration, 50);

    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - start;
      const pct = Math.min(100, (elapsed / duration) * 100);
      setProgress(pct);

      if (pct >= 100) {
        stopTimers();
        dispatch({ type: 'ANIMATION_DONE' });
      }
    }, 100);

    return () => {
      stopTimers();
    };
  }, [state.status, state.stepIndex, stopTimers]);

  useEffect(() => {
    if (state.status !== 'animating') {
      return;
    }

    const step = PIXIE_DUST_STEPS[state.stepIndex];
    setLog((prev) => [...prev, `▶ ${step.title}`]);
  }, [state.status, state.stepIndex]);

  useEffect(() => {
    if (state.status !== 'awaitingNext') {
      return;
    }

    const { stepIndex } = state;
    if (narratedStepsRef.current.has(stepIndex)) {
      return;
    }

    narratedStepsRef.current.add(stepIndex);
    const step = PIXIE_DUST_STEPS[stepIndex];
    setLog((prev) => [...prev, step.narrative]);
  }, [state]);

  useEffect(() => {
    if (state.status !== 'finished' || completionLoggedRef.current) {
      return;
    }

    completionLoggedRef.current = true;
    setLog((prev) => [
      ...prev,
      `✔ Cracked ${ap.ssid} WPS PIN and restored configuration.`,
    ]);
  }, [state.status, ap.ssid]);

  useEffect(() => {
    if (state.status === 'cancelled') {
      stopTimers();
      onExit();
    }
  }, [state.status, onExit, stopTimers]);

  const stepCount = PIXIE_DUST_STEPS.length;
  const activeStepIndex = Math.min(state.stepIndex, stepCount - 1);
  const currentStep = PIXIE_DUST_STEPS[activeStepIndex];

  const overallProgress = useMemo(() => {
    if (state.status === 'finished') {
      return 100;
    }

    const base = (state.stepIndex / stepCount) * 100;
    const fraction = progress / stepCount;
    return Math.min(100, base + fraction);
  }, [progress, state.status, state.stepIndex, stepCount]);

  const stepStatuses: StepStatus[] = useMemo(() => {
    return PIXIE_DUST_STEPS.map((_, index) => {
      if (state.status === 'finished') {
        return 'completed';
      }

      if (index < state.stepIndex) {
        return 'completed';
      }

      if (index === state.stepIndex) {
        if (state.status === 'awaitingNext') {
          return 'ready';
        }
        if (state.status === 'animating') {
          return 'running';
        }
      }

      return 'pending';
    });
  }, [state]);

  const nextDisabled =
    state.status !== 'awaitingNext' && state.status !== 'finished';

  const nextLabel = useMemo(() => {
    if (state.status === 'finished') {
      return 'Return to access points';
    }

    const lastStep = state.stepIndex >= stepCount - 1;
    return lastStep ? 'Finish' : 'Next step';
  }, [state.status, state.stepIndex, stepCount]);

  const handleNext = () => {
    if (state.status === 'awaitingNext') {
      dispatch({ type: 'NEXT' });
    } else if (state.status === 'finished') {
      stopTimers();
      onExit();
    }
  };

  const handleCancel = () => {
    stopTimers();
    dispatch({ type: 'CANCEL' });
  };

  const statusBadge = (status: StepStatus) => {
    switch (status) {
      case 'completed':
        return {
          text: 'Complete',
          className: 'bg-green-600/20 text-green-300',
        };
      case 'running':
        return {
          text: 'Running',
          className: 'bg-yellow-600/20 text-yellow-300',
        };
      case 'ready':
        return {
          text: 'Ready to advance',
          className: 'bg-blue-600/20 text-blue-300',
        };
      default:
        return {
          text: 'Pending',
          className: 'bg-gray-700 text-gray-300',
        };
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold">{ap.ssid}</h3>
          <p className="text-xs font-mono text-gray-400">{ap.bssid}</p>
        </div>
        <div className="text-sm text-gray-300">
          WPS status:{' '}
          <span className="uppercase tracking-wide text-white">
            {ap.wps}
          </span>
        </div>
      </div>
      <p className="text-sm text-gray-300 mb-4">
        Pixie Dust reuses captured WPS handshakes to derive the registrar PIN
        without additional air-time. Follow the guided offline workflow below.
      </p>
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
          <span>
            Step {Math.min(state.stepIndex + 1, stepCount)} of {stepCount}
          </span>
          <span>{Math.round(overallProgress)}% overall</span>
        </div>
        <div className="w-full h-2 bg-gray-700 rounded" aria-hidden="true">
          <div
            role="progressbar"
            aria-label="Overall Pixie Dust progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(overallProgress)}
            className="h-2 bg-blue-500 rounded"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-5">
        <div className="md:col-span-2 space-y-2">
          {PIXIE_DUST_STEPS.map((step, index) => {
            const status = statusBadge(stepStatuses[index]);
            return (
              <div
                key={step.id}
                className="bg-gray-900 rounded p-3 border border-gray-700"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{step.title}</p>
                  <span
                    className={`text-[10px] px-2 py-1 rounded-full ${status.className}`}
                  >
                    {status.text}
                  </span>
                </div>
                <p className="text-xs text-gray-300 mt-2">{step.description}</p>
              </div>
            );
          })}
        </div>
        <div className="md:col-span-3 space-y-3">
          <div className="bg-gray-900 rounded p-3">
            <h4 className="font-semibold text-lg mb-1">{currentStep.title}</h4>
            <p className="text-sm text-gray-300 mb-3">{currentStep.description}</p>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Step progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-700 rounded" aria-hidden="true">
              <div
                role="progressbar"
                aria-label={`${currentStep.title} progress`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(progress)}
                className="h-2 bg-green-500 rounded"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
          <div className="bg-gray-900 rounded p-3">
            <h5 className="font-semibold text-sm mb-2">Narrative</h5>
            <ul className="space-y-1 text-xs text-gray-200" aria-live="polite">
              {log.length === 0 ? (
                <li>Initializing capture workflow…</li>
              ) : (
                log.map((entry, index) => (
                  <li key={`${index}-${entry}`}>{entry}</li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mt-4">
        <button
          type="button"
          onClick={handleCancel}
          className="px-4 py-2 rounded bg-red-700 hover:bg-red-600 transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={nextDisabled}
          className="px-4 py-2 rounded bg-blue-700 hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
};

export default PixieDustDemo;
