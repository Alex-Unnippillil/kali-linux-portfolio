'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import useFocusTrap from '../../hooks/useFocusTrap';
import { useSettings } from '../../hooks/useSettings';

type Placement = 'top' | 'right' | 'bottom' | 'left';

interface TourStep {
  id: string;
  title: string;
  description: string;
  target: string;
  placement: Placement;
}

interface HighlightRect {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

const STEPS: TourStep[] = [
  {
    id: 'launcher',
    title: 'Launcher',
    description:
      'Open the launcher to browse every app in the Kali desktop. Use the grid button at the bottom of the dock or press the Super key.',
    target: '[data-tour-target="launcher"]',
    placement: 'right',
  },
  {
    id: 'dock',
    title: 'Dock',
    description:
      'Pinned tools live in the dock for quick access. Click an icon to open it or right-click for more actions.',
    target: '[data-tour-target="dock"]',
    placement: 'right',
  },
  {
    id: 'window-controls',
    title: 'Window controls',
    description:
      'Every window has minimize, maximize, and close controls. Use them with the mouse or keyboard shortcuts to manage your workspace.',
    target: '[data-tour-target="window-controls"]',
    placement: 'bottom',
  },
];

const HIGHLIGHT_PADDING = 12;

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

function expandRect(rect: DOMRect, padding: number): HighlightRect {
  return {
    top: rect.top - padding,
    left: rect.left - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
  };
}

function computeCardPosition(rect: HighlightRect | null, placement: Placement) {
  if (typeof window === 'undefined' || !rect) {
    return {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
    } as const;
  }

  const margin = 20;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  let top = rect.top;
  let left = rect.left;
  let translateX = 0;
  let translateY = 0;

  switch (placement) {
    case 'top':
      top = rect.top - margin;
      left = rect.left + rect.width / 2;
      translateX = -50;
      translateY = -100;
      break;
    case 'right':
      top = rect.top + rect.height / 2;
      left = rect.right + margin;
      translateX = 0;
      translateY = -50;
      break;
    case 'left':
      top = rect.top + rect.height / 2;
      left = rect.left - margin;
      translateX = -100;
      translateY = -50;
      break;
    case 'bottom':
    default:
      top = rect.bottom + margin;
      left = rect.left + rect.width / 2;
      translateX = -50;
      translateY = 0;
      break;
  }

  top = clamp(top, margin, viewportHeight - margin);
  left = clamp(left, margin, viewportWidth - margin);

  return {
    top,
    left,
    transform: `translate(${translateX}%, ${translateY}%)`,
  } as const;
}

interface TourProps {
  ready?: boolean;
}

const Tour = ({ ready = true }: TourProps) => {
  const { tourCompleted, setTourCompleted, reducedMotion } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [highlightRect, setHighlightRect] = useState<HighlightRect | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const nextButtonRef = useRef<HTMLButtonElement>(null);

  useFocusTrap(panelRef, isOpen);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalRoot(document.body);
    }
  }, []);

  useEffect(() => {
    if (!tourCompleted && ready) {
      setIsOpen(true);
      setStepIndex(0);
    } else {
      setIsOpen(false);
    }
  }, [tourCompleted, ready]);

  useEffect(() => {
    if (!isOpen) return;
    const button = nextButtonRef.current;
    button?.focus();
  }, [isOpen, stepIndex]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const currentStep = useMemo(() => STEPS[stepIndex] ?? null, [stepIndex]);

  useEffect(() => {
    if (!isOpen || !currentStep || !ready) {
      setHighlightRect(null);
      return;
    }

    const node = document.querySelector(currentStep.target) as HTMLElement | null;
    if (!node) {
      setHighlightRect(null);
      return;
    }

    const updateRect = () => {
      const rect = node.getBoundingClientRect();
      setHighlightRect(expandRect(rect, HIGHLIGHT_PADDING));
    };

    updateRect();

    const resizeObserver =
      typeof window !== 'undefined' && 'ResizeObserver' in window
        ? new ResizeObserver(() => updateRect())
        : null;

    resizeObserver?.observe(node);
    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, true);

    return () => {
      resizeObserver?.disconnect();
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect, true);
    };
  }, [isOpen, currentStep, ready]);

  const finishTour = useCallback(() => {
    setTourCompleted(true);
    setIsOpen(false);
  }, [setTourCompleted]);

  const goNext = useCallback(() => {
    setStepIndex((index) => {
      if (index >= STEPS.length - 1) {
        finishTour();
        return index;
      }
      return index + 1;
    });
  }, [finishTour]);

  const goPrevious = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1));
  }, []);

  const skipTour = useCallback(() => {
    finishTour();
  }, [finishTour]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!isOpen) return;
      if (event.key === 'ArrowRight') {
        event.preventDefault();
        goNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goPrevious();
      } else if (event.key === 'Escape') {
        event.preventDefault();
        skipTour();
      }
    },
    [goNext, goPrevious, isOpen, skipTour],
  );

  if (!portalRoot || !isOpen || !currentStep || !ready) {
    return null;
  }

  const titleId = 'desktop-tour-title';
  const descriptionId = 'desktop-tour-description';
  const stepPosition = computeCardPosition(highlightRect, currentStep.placement);
  const highlightStyle = highlightRect
    ? {
        top: Math.max(0, highlightRect.top),
        left: Math.max(0, highlightRect.left),
        width: highlightRect.width,
        height: highlightRect.height,
      }
    : undefined;

  const transitionClass = reducedMotion ? '' : 'transition-all duration-300 ease-out';

  return createPortal(
    <div
      className="fixed inset-0 z-[1000]"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onKeyDown={handleKeyDown}
    >
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      {highlightRect && (
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute rounded-xl border-2 border-ub-orange shadow-[0_0_0_9999px_rgba(0,0,0,0.6)] ${transitionClass}`}
          style={highlightStyle}
        />
      )}
      <div
        className="absolute w-full max-w-md px-4"
        style={{ top: stepPosition.top, left: stepPosition.left, transform: stepPosition.transform }}
      >
        <div
          ref={panelRef}
          tabIndex={-1}
          className="rounded-lg border border-ubt-grey/60 bg-ub-dark p-4 text-white shadow-xl focus:outline-none"
        >
          <p className="text-xs uppercase tracking-wide text-ubt-grey" aria-live="polite">
            Step {stepIndex + 1} of {STEPS.length}
          </p>
          <h2 id={titleId} className="mt-1 text-lg font-semibold">
            {currentStep.title}
          </h2>
          <p id={descriptionId} className="mt-2 text-sm text-ubt-grey" aria-live="polite">
            {currentStep.description}
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={goPrevious}
              disabled={stepIndex === 0}
              className={`rounded bg-ubt-cool-grey px-3 py-2 text-sm font-medium text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-black ${
                stepIndex === 0
                  ? 'cursor-not-allowed opacity-60'
                  : 'hover:bg-ub-orange/90'
              }`}
            >
              Back
            </button>
            <div className="ml-auto flex gap-2">
              <button
                type="button"
                onClick={skipTour}
                className="rounded border border-ubt-grey px-3 py-2 text-sm font-medium text-white hover:bg-ubt-grey/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-ub-orange focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                Skip tour
              </button>
              <button
                ref={nextButtonRef}
                type="button"
                onClick={stepIndex === STEPS.length - 1 ? finishTour : goNext}
                className="rounded bg-ub-orange px-3 py-2 text-sm font-semibold text-white hover:bg-ub-orange/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-black"
              >
                {stepIndex === STEPS.length - 1 ? 'Finish' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>,
    portalRoot,
  );
};

export default Tour;
