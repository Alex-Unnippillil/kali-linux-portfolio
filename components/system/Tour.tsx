'use client';

import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

export interface TourStep {
  id: string;
  title: React.ReactNode;
  description: React.ReactNode;
  /**
   * Optional additional context announced to assistive tech about the element being highlighted.
   */
  targetLabel?: React.ReactNode;
}

export interface TourProps {
  open: boolean;
  steps: TourStep[];
  onClose: () => void;
  /**
   * First step to show when the tour opens.
   */
  initialStep?: number;
  /**
   * Custom heading announced for the dialog.
   */
  title?: React.ReactNode;
  /**
   * Additional class names for the surface element.
   */
  className?: string;
}

const FOCUSABLE_SELECTOR =
  'a[href], area[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), summary, [tabindex]:not([tabindex="-1"])';

const isElementVisible = (element: HTMLElement) => {
  if (element.hasAttribute('hidden')) return false;
  if ((element as HTMLElement).style.display === 'none') return false;
  const rects = element.getClientRects();
  return rects.length > 0;
};

const clsx = (...values: (string | false | null | undefined)[]) =>
  values.filter(Boolean).join(' ');

const Tour: React.FC<TourProps> = ({
  open,
  steps,
  onClose,
  initialStep = 0,
  title = 'Application tour',
  className,
}) => {
  const clampIndex = useCallback(
    (index: number) => {
      if (steps.length === 0) return 0;
      return Math.min(Math.max(index, 0), steps.length - 1);
    },
    [steps.length]
  );

  const [currentIndex, setCurrentIndex] = useState(() => clampIndex(initialStep));

  useEffect(() => {
    setCurrentIndex(clampIndex(initialStep));
  }, [initialStep, clampIndex]);

  const hasSteps = steps.length > 0;
  const safeIndex = hasSteps ? clampIndex(currentIndex) : 0;
  const currentStep = hasSteps ? steps[safeIndex] : null;

  const dialogRef = useRef<HTMLDivElement | null>(null);
  const stepRegionRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const prevOpenRef = useRef(open);

  useEffect(() => {
    if (open) {
      previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
      requestAnimationFrame(() => {
        const focusTarget = dialogRef.current?.querySelector<HTMLElement>('[data-tour-focus]');
        if (focusTarget) {
          focusTarget.focus({ preventScroll: true });
        } else {
          dialogRef.current?.focus({ preventScroll: true });
        }
      });
    } else if (prevOpenRef.current && previouslyFocusedRef.current) {
      const el = previouslyFocusedRef.current;
      requestAnimationFrame(() => {
        el.focus?.({ preventScroll: true });
        previouslyFocusedRef.current = null;
      });
    }
    prevOpenRef.current = open;
  }, [open]);

  const getFocusableElements = useCallback(() => {
    if (!dialogRef.current) return [] as HTMLElement[];
    const nodes = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    );
    return nodes.filter((node) =>
      !node.hasAttribute('disabled') &&
      node.getAttribute('tabindex') !== '-1' &&
      !node.getAttribute('aria-hidden') &&
      isElementVisible(node)
    );
  }, []);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = getFocusableElements();
      if (focusable.length === 0) {
        dialogRef.current?.focus({ preventScroll: true });
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement as HTMLElement | null;

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      } else if (event.shiftKey && (active === first || active === dialogRef.current)) {
        event.preventDefault();
        last.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [getFocusableElements, onClose, open]);

  useEffect(() => {
    if (!open) return;
    if (!stepRegionRef.current) return;

    requestAnimationFrame(() => {
      stepRegionRef.current?.focus({ preventScroll: true });
    });
  }, [open, safeIndex]);

  const goToStep = useCallback(
    (index: number) => {
      setCurrentIndex(clampIndex(index));
    },
    [clampIndex]
  );

  const handleNext = useCallback(() => {
    if (!hasSteps) return;
    if (safeIndex >= steps.length - 1) {
      onClose();
      return;
    }
    goToStep(safeIndex + 1);
  }, [goToStep, hasSteps, onClose, safeIndex, steps.length]);

  const handlePrevious = useCallback(() => {
    if (!hasSteps) return;
    goToStep(safeIndex - 1);
  }, [goToStep, hasSteps, safeIndex]);

  const dialogHeadingId = useId();
  const stepHeadingId = useId();
  const stepDescriptionId = useId();
  const liveRegionId = useId();

  const progressLabel = useMemo(() => {
    if (!hasSteps) return '';
    return `Step ${safeIndex + 1} of ${steps.length}`;
  }, [hasSteps, safeIndex, steps.length]);

  if (!open || !hasSteps || !currentStep) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogHeadingId}
        aria-describedby={stepDescriptionId}
        tabIndex={-1}
        className={clsx(
          'w-full max-w-xl rounded-lg bg-slate-900 text-slate-100 shadow-xl outline-none focus-visible:ring-2 focus-visible:ring-cyan-400',
          'flex flex-col gap-4 p-6',
          className
        )}
        data-testid="tour-dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={dialogHeadingId} className="text-xl font-semibold">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded px-2 py-1 text-sm font-medium text-slate-200 hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            Close tour
          </button>
        </div>

        <div id={liveRegionId} role="status" aria-live="polite" className="sr-only">
          {progressLabel}: {typeof currentStep.title === 'string' ? currentStep.title : ''}
        </div>

        <nav aria-label="Tour steps">
          <ol className="flex flex-wrap gap-2">
            {steps.map((step, index) => {
              const isActive = index === safeIndex;
              return (
                <li key={step.id}>
                  <button
                    type="button"
                    onClick={() => goToStep(index)}
                    aria-current={isActive ? 'step' : undefined}
                    className={clsx(
                      'rounded-full border px-3 py-1 text-sm transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400',
                      isActive
                        ? 'border-cyan-400 bg-cyan-500/20 text-cyan-200'
                        : 'border-slate-600 bg-slate-800 text-slate-200 hover:border-cyan-400 hover:text-cyan-200'
                    )}
                  >
                    <span className="sr-only">Step {index + 1}:</span>{' '}
                    {step.title}
                  </button>
                </li>
              );
            })}
          </ol>
        </nav>

        <section
          ref={stepRegionRef}
          tabIndex={-1}
          aria-labelledby={stepHeadingId}
          aria-describedby={stepDescriptionId}
          data-tour-focus
          className="space-y-2 rounded-lg bg-slate-800/60 p-4 shadow-inner"
        >
          <h3 id={stepHeadingId} className="text-lg font-semibold">
            {currentStep.title}
          </h3>
          <div id={stepDescriptionId} className="text-sm leading-relaxed text-slate-200">
            {currentStep.description}
          </div>
          {currentStep.targetLabel ? (
            <p className="text-xs text-slate-400">{currentStep.targetLabel}</p>
          ) : null}
        </section>

        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handlePrevious}
            disabled={safeIndex === 0}
            className={clsx(
              'rounded px-3 py-2 text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400',
              safeIndex === 0
                ? 'cursor-not-allowed bg-slate-700 text-slate-400'
                : 'bg-slate-800 text-slate-100 hover:bg-slate-700'
            )}
          >
            Previous
          </button>
          <div className="text-sm" aria-hidden="true">
            {progressLabel}
          </div>
          <button
            type="button"
            onClick={handleNext}
            className="rounded bg-cyan-500 px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-400"
          >
            {safeIndex === steps.length - 1 ? 'Finish tour' : 'Next step'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Tour;
