"use client";

import { useCallback, useEffect, useMemo, useRef } from 'react';
import usePrefersReducedMotion from '../../hooks/usePrefersReducedMotion';
import { useWelcomeTour } from '../../hooks/useWelcomeTour';

const STEPS = [
  {
    title: 'Welcome to the Kali Portfolio desktop',
    description:
      'This workspace mirrors the Kali Linux UI. Explore simulated security tools, retro games, and utilities without leaving your browser.',
  },
  {
    title: 'Open apps from the launcher grid',
    description:
      'Activate the dock launcher or press Alt+Space to browse applications. Use arrow keys and Enter to open windows instantly.',
  },
  {
    title: 'Arrange and manage windows',
    description:
      'Drag windows, snap them to edges, or use built-in layouts. Window controls let you minimize, maximize, or close each experience.',
  },
  {
    title: 'Stay on top of notifications',
    description:
      'The top bar shows status indicators and the notification center. Keep an eye on background jobs and simulated alerts there.',
  },
  {
    title: 'Personalize your environment',
    description:
      'Open Settings to change wallpapers, switch themes, or tweak accessibility options like reduced motion and large hit areas.',
  },
  {
    title: 'Need quick assistance?',
    description:
      'Press ? to open the keyboard shortcut guide, or revisit this tour anytime from Settings if you need a refresher.',
  },
];

const totalSteps = STEPS.length;

const isFocusableTarget = (element: EventTarget | null) => {
  if (!(element instanceof HTMLElement)) return false;
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'TEXTAREA' ||
    element.isContentEditable ||
    element.closest('[contenteditable="true"]') !== null
  );
};

const WelcomeTour = () => {
  const { state, startTour, resumeTour, restartTour, skipTour, completeTour, setStep } = useWelcomeTour();
  const prefersReducedMotion = usePrefersReducedMotion();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const resumeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const previousStatusRef = useRef(state.status);

  const activeStepIndex = useMemo(() => {
    if (totalSteps === 0) return 0;
    return Math.min(state.currentStep ?? 0, totalSteps - 1);
  }, [state.currentStep]);

  useEffect(() => {
    if (state.status === 'not-started') {
      startTour();
    }
  }, [state.status, startTour]);

  useEffect(() => {
    if (state.status === 'active' && state.currentStep >= totalSteps) {
      completeTour();
    }
  }, [state.status, state.currentStep, completeTour]);

  useEffect(() => {
    if (state.status === 'active' && headingRef.current) {
      headingRef.current.focus();
    }
  }, [state.status, activeStepIndex]);

  useEffect(() => {
    if (state.status === 'active' && previousStatusRef.current !== 'active') {
      previousFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    }

    if (state.status !== 'active' && previousStatusRef.current === 'active') {
      if (state.status === 'skipped' && resumeButtonRef.current) {
        resumeButtonRef.current.focus();
      } else if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
      previousFocusRef.current = null;
    }

    previousStatusRef.current = state.status;
  }, [state.status]);

  const handleNext = useCallback(() => {
    if (activeStepIndex >= totalSteps - 1) {
      completeTour();
    } else {
      setStep((prev) => prev + 1);
    }
  }, [activeStepIndex, completeTour, setStep]);

  const handlePrevious = useCallback(() => {
    if (activeStepIndex > 0) {
      setStep(activeStepIndex - 1);
    }
  }, [activeStepIndex, setStep]);

  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (state.status !== 'active') return;
      if (isFocusableTarget(event.target)) return;

      if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrevious();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        skipTour();
      }
    },
    [handleNext, handlePrevious, skipTour, state.status],
  );

  useEffect(() => {
    if (state.status !== 'active') return;
    window.addEventListener('keydown', handleKeydown);
    return () => {
      window.removeEventListener('keydown', handleKeydown);
    };
  }, [handleKeydown, state.status]);

  const handleStepSelect = useCallback(
    (index: number) => {
      setStep(Math.max(0, Math.min(index, totalSteps - 1)));
    },
    [setStep],
  );

  if (state.status !== 'active' && state.status !== 'skipped') {
    return null;
  }

  const currentStep = STEPS[activeStepIndex];
  const headingId = `welcome-tour-step-${activeStepIndex}-title`;
  const descriptionId = `welcome-tour-step-${activeStepIndex}-description`;
  const progressLabel = `Step ${activeStepIndex + 1} of ${totalSteps}`;

  return (
    <>
      {state.status === 'skipped' && (
        <button
          ref={resumeButtonRef}
          type="button"
          className="fixed bottom-4 right-4 z-40 rounded-full bg-slate-800 px-4 py-2 text-sm font-medium text-white shadow-lg focus:outline-none focus-visible:ring focus-visible:ring-slate-300"
          onClick={resumeTour}
          aria-label="Resume welcome tour"
        >
          Resume welcome tour
        </button>
      )}
      {state.status === 'active' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-8">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={headingId}
            aria-describedby={descriptionId}
            className={`w-full max-w-xl rounded-lg bg-slate-900 p-6 text-white shadow-2xl focus:outline-none focus-visible:ring focus-visible:ring-slate-300 ${
              prefersReducedMotion ? '' : 'transition-transform duration-200 ease-out'
            }`}
            data-reduced-motion={prefersReducedMotion ? 'true' : 'false'}
            style={prefersReducedMotion ? undefined : { transform: 'translateY(0)' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400" aria-live="polite">
                  {progressLabel}
                </p>
                <h2
                  ref={headingRef}
                  tabIndex={-1}
                  id={headingId}
                  className="mt-2 text-2xl font-semibold"
                >
                  {currentStep.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={skipTour}
                className="text-sm font-medium text-slate-300 underline decoration-slate-500 decoration-dotted transition hover:text-white focus:outline-none focus-visible:ring focus-visible:ring-slate-300"
                aria-label="Skip welcome tour"
              >
                Skip
              </button>
            </div>
            <p id={descriptionId} className="mt-4 text-base leading-relaxed text-slate-200">
              {currentStep.description}
            </p>
            <nav className="mt-6" aria-label="Tour progress">
              <ol className="flex items-center gap-2" role="list">
                {STEPS.map((step, index) => (
                  <li key={step.title}>
                    <button
                      type="button"
                      aria-label={`Go to step ${index + 1}: ${step.title}`}
                      aria-current={index === activeStepIndex ? 'step' : undefined}
                      className={`h-2.5 w-10 rounded-full ${
                        index === activeStepIndex ? 'bg-sky-400' : 'bg-slate-600 hover:bg-slate-500'
                      } focus:outline-none focus-visible:ring focus-visible:ring-slate-200`}
                      onClick={() => handleStepSelect(index)}
                    />
                  </li>
                ))}
              </ol>
            </nav>
            <div className="mt-6 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={activeStepIndex === 0}
                className="rounded-md border border-slate-600 px-3 py-2 text-sm font-medium text-slate-200 transition disabled:cursor-not-allowed disabled:opacity-50 hover:border-slate-500 hover:text-white focus:outline-none focus-visible:ring focus-visible:ring-slate-300"
              >
                Back
              </button>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={restartTour}
                  className="rounded-md border border-transparent px-3 py-2 text-xs font-semibold text-slate-300 underline decoration-dotted transition hover:text-white focus:outline-none focus-visible:ring focus-visible:ring-slate-300"
                >
                  Restart
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-md bg-sky-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-400 focus:outline-none focus-visible:ring focus-visible:ring-slate-300"
                >
                  {activeStepIndex === totalSteps - 1 ? 'Finish' : 'Next'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default WelcomeTour;
