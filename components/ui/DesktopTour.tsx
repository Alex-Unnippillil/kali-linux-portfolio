"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { createPortal } from 'react-dom';

type TourPlacement = 'bottom' | 'top' | 'right' | 'left';

type TourStep = {
  id: string;
  title: string;
  description: string;
  target: string;
  placement?: TourPlacement;
};

const TOUR_STEPS: readonly TourStep[] = [
  {
    id: 'applications',
    title: 'Applications menu',
    description:
      'Open the full catalog of tools, games, and simulations. Use search or categories to launch anything instantly.',
    target: '[data-tour-target="applications-menu-button"]',
    placement: 'bottom',
  },
  {
    id: 'status',
    title: 'System status & quick settings',
    description:
      'Check the time, monitor running apps, and toggle preferences like sound or reduced motion from here.',
    target: '#status-bar',
    placement: 'bottom',
  },
  {
    id: 'workspace',
    title: 'Workspace & windows',
    description:
      'Launch apps, drag windows between workspaces, and right-click the desktop for more options and layouts.',
    target: '#desktop',
    placement: 'top',
  },
] as const;

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface DesktopTourProps {
  open: boolean;
  onAdvance?: (nextStepIndex: number) => void;
  onSkip?: (stepIndex: number) => void;
  onRestart?: () => void;
  onComplete?: () => void;
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const ESTIMATED_PANEL_WIDTH = 360;
const ESTIMATED_PANEL_HEIGHT = 220;
const HIGHLIGHT_PADDING = 12;

const DesktopTour = ({
  open,
  onAdvance,
  onSkip,
  onRestart,
  onComplete,
}: DesktopTourProps) => {
  const [mounted, setMounted] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const targetRef = useRef<HTMLElement | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const primaryButtonRef = useRef<HTMLButtonElement | null>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const prevOpenRef = useRef<boolean>(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  useEffect(() => {
    const wasOpen = prevOpenRef.current;
    if (open && !wasOpen) {
      previouslyFocusedElementRef.current = document.activeElement as HTMLElement | null;
    }

    if (!open && wasOpen) {
      const toRestore = previouslyFocusedElementRef.current;
      previouslyFocusedElementRef.current = null;
      if (toRestore && typeof toRestore.focus === 'function') {
        window.requestAnimationFrame(() => {
          try {
            toRestore.focus();
          } catch (error) {
            // ignore focus restoration errors
          }
        });
      }
    }

    prevOpenRef.current = open;
  }, [open]);

  useEffect(() => {
    if (!open || typeof document === 'undefined') return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setStepIndex(0);
    } else {
      setStepIndex(0);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const focusTarget = primaryButtonRef.current || dialogRef.current;
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus();
    }
  }, [open, stepIndex]);

  const step = TOUR_STEPS[stepIndex] || TOUR_STEPS[0];
  const isLastStep = stepIndex >= TOUR_STEPS.length - 1;
  const stepCountLabel = useMemo(
    () => `Step ${stepIndex + 1} of ${TOUR_STEPS.length}`,
    [stepIndex],
  );

  const handleAdvance = useCallback(() => {
    if (isLastStep) {
      onComplete?.();
      return;
    }
    const nextIndex = stepIndex + 1;
    setStepIndex(nextIndex);
    onAdvance?.(nextIndex);
  }, [isLastStep, onComplete, onAdvance, stepIndex]);

  const handleSkip = useCallback(() => {
    onSkip?.(stepIndex);
  }, [onSkip, stepIndex]);

  const handleRestart = useCallback(() => {
    setStepIndex(0);
    onRestart?.();
  }, [onRestart]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!open) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        handleSkip();
        return;
      }

      if (event.key !== 'Tab') return;

      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((node) => node.offsetParent !== null || node === document.activeElement);

      if (!focusable.length) {
        event.preventDefault();
        dialog.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    },
    [handleSkip, open],
  );

  const updateHighlightRect = useCallback((element: HTMLElement | null) => {
    targetRef.current = element;
    if (!element) {
      setHighlightRect(null);
      return;
    }
    const rect = element.getBoundingClientRect();
    setHighlightRect(rect);
  }, []);

  const observeCurrentTarget = useCallback(() => {
    if (!open || typeof document === 'undefined') return;
    const selector = step?.target;
    if (!selector) {
      updateHighlightRect(null);
      return;
    }

    const element = document.querySelector<HTMLElement>(selector);
    if (element) {
      updateHighlightRect(element);

      if (typeof ResizeObserver !== 'undefined') {
        resizeObserverRef.current?.disconnect();
        const observer = new ResizeObserver(() => {
          updateHighlightRect(element);
        });
        observer.observe(element);
        resizeObserverRef.current = observer;
      }
    } else {
      updateHighlightRect(null);
      animationFrameRef.current = window.requestAnimationFrame(observeCurrentTarget);
    }
  }, [open, step?.target, updateHighlightRect]);

  useLayoutEffect(() => {
    if (!open) return undefined;

    observeCurrentTarget();

    const handleWindowChange = () => {
      if (!open) return;
      if (targetRef.current) {
        updateHighlightRect(targetRef.current);
      }
    };

    window.addEventListener('resize', handleWindowChange);
    window.addEventListener('scroll', handleWindowChange, true);

    return () => {
      if (animationFrameRef.current !== null) {
        window.cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      resizeObserverRef.current?.disconnect();
      resizeObserverRef.current = null;
      window.removeEventListener('resize', handleWindowChange);
      window.removeEventListener('scroll', handleWindowChange, true);
    };
  }, [observeCurrentTarget, open, stepIndex, updateHighlightRect]);

  const highlightStyle = useMemo(() => {
    if (!highlightRect || typeof window === 'undefined') return undefined;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const top = clamp(highlightRect.top - HIGHLIGHT_PADDING, 8, viewportHeight - 8);
    const left = clamp(highlightRect.left - HIGHLIGHT_PADDING, 8, viewportWidth - 8);
    const maxWidth = viewportWidth - left - 8;
    const maxHeight = viewportHeight - top - 8;
    const width = Math.max(Math.min(highlightRect.width + HIGHLIGHT_PADDING * 2, maxWidth), 0);
    const height = Math.max(Math.min(highlightRect.height + HIGHLIGHT_PADDING * 2, maxHeight), 0);
    return {
      top: `${top}px`,
      left: `${left}px`,
      width: `${width}px`,
      height: `${height}px`,
    } satisfies CSSProperties;
  }, [highlightRect]);

  const panelStyle = useMemo<CSSProperties>(() => {
    if (typeof window === 'undefined') {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    if (!highlightRect) {
      return {
        bottom: '32px',
        left: '50%',
        transform: 'translateX(-50%)',
      };
    }

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const placement: TourPlacement = step?.placement || 'bottom';
    let left = highlightRect.left + highlightRect.width / 2;
    let top = highlightRect.bottom + 24;
    let transform = 'translate(-50%, 0)';

    if (placement === 'top') {
      top = highlightRect.top - 24;
      transform = 'translate(-50%, -100%)';
    } else if (placement === 'right') {
      left = highlightRect.right + 24;
      top = highlightRect.top + highlightRect.height / 2;
      transform = 'translate(0, -50%)';
    } else if (placement === 'left') {
      left = highlightRect.left - 24;
      top = highlightRect.top + highlightRect.height / 2;
      transform = 'translate(-100%, -50%)';
    }

    const horizontalMargin = 24;
    const verticalMargin = 24;

    if (transform.includes('translate(-50%')) {
      left = clamp(
        left,
        horizontalMargin + ESTIMATED_PANEL_WIDTH / 2,
        viewportWidth - horizontalMargin - ESTIMATED_PANEL_WIDTH / 2,
      );
    } else if (transform.includes('translate(0')) {
      left = clamp(left, horizontalMargin, viewportWidth - horizontalMargin);
    } else {
      left = clamp(left, horizontalMargin, viewportWidth - horizontalMargin);
    }

    if (transform.includes('-100%)')) {
      top = clamp(
        top,
        verticalMargin + ESTIMATED_PANEL_HEIGHT,
        viewportHeight - verticalMargin,
      );
    } else if (transform.includes('-50%)')) {
      top = clamp(
        top,
        verticalMargin + ESTIMATED_PANEL_HEIGHT / 2,
        viewportHeight - verticalMargin - ESTIMATED_PANEL_HEIGHT / 2,
      );
    } else {
      top = clamp(top, verticalMargin, viewportHeight - verticalMargin);
    }

    return {
      top: `${top}px`,
      left: `${left}px`,
      transform,
    };
  }, [highlightRect, step?.placement]);

  if (!mounted || !open || typeof document === 'undefined') {
    return null;
  }

  const titleId = `desktop-tour-${step.id}-title`;
  const descriptionId = `desktop-tour-${step.id}-description`;

  return createPortal(
    <div className="fixed inset-0 z-[9999]" role="presentation">
      <div
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        aria-hidden="true"
      />
      {highlightStyle && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[24px] border-2 border-sky-400/80 shadow-[0_0_0_12px_rgba(7,13,26,0.55)] transition-all duration-200 ease-out"
          style={highlightStyle}
        />
      )}
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Desktop tour"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        className="pointer-events-auto w-full max-w-xl rounded-2xl border border-white/10 bg-slate-900/90 p-6 text-white shadow-[0_20px_60px_rgba(8,16,31,0.65)] backdrop-blur-xl focus:outline-none"
        style={{ ...panelStyle, position: 'fixed' }}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-sky-300/80">
          {stepCountLabel}
        </p>
        <h2 id={titleId} className="mt-3 text-2xl font-semibold text-white">
          {step.title}
        </h2>
        <p id={descriptionId} className="mt-2 text-sm leading-relaxed text-white/80">
          {step.description}
        </p>
        {!highlightStyle && (
          <p className="mt-4 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs text-white/70">
            We could not highlight this element automatically. You can still continue the tour.
          </p>
        )}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-full border border-white/20 px-4 py-2 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          >
            Skip tour
          </button>
          <div className="flex items-center gap-2">
            {isLastStep && (
              <button
                type="button"
                onClick={handleRestart}
                className="rounded-full border border-transparent px-4 py-2 text-sm font-medium text-white/80 transition hover:border-white/20 hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
              >
                Restart
              </button>
            )}
            <button
              type="button"
              ref={primaryButtonRef}
              onClick={handleAdvance}
              className="rounded-full bg-sky-400 px-4 py-2 text-sm font-semibold text-slate-900 shadow transition hover:bg-sky-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-200"
            >
              {isLastStep ? 'Finish tour' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
};

export default DesktopTour;
