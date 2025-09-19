'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface TutorialStep {
  title: string;
  body: ReactNode;
  selector?: string;
  tip?: ReactNode;
}

interface HelpOverlayProps {
  open: boolean;
  title: string;
  steps: TutorialStep[];
  onClose: () => void;
  finishLabel?: string;
}

const FOCUSABLE_SELECTORS =
  'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';

const HelpOverlay: React.FC<HelpOverlayProps> = ({
  open,
  title,
  steps,
  onClose,
  finishLabel = 'Finish',
}) => {
  const [index, setIndex] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const highlightRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  const close = useCallback(() => {
    onClose();
  }, [onClose]);

  const handlePrev = useCallback(() => {
    setIndex((value) => Math.max(0, value - 1));
  }, []);

  const handleNext = useCallback(() => {
    setIndex((value) => {
      if (value >= steps.length - 1) {
        close();
        return value;
      }
      return value + 1;
    });
  }, [close, steps.length]);

  useEffect(() => {
    if (!open) {
      setIndex(0);
      if (highlightRef.current) {
        highlightRef.current.removeAttribute('data-help-highlight');
        highlightRef.current = null;
      }
      return;
    }

    previouslyFocused.current = document.activeElement as HTMLElement | null;

    const node = cardRef.current;
    if (!node) return;

    const focusables = Array.from(
      node.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter((el) => !el.hasAttribute('disabled'));

    focusables[0]?.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!open) return;
      if (event.key === 'Tab' && focusables.length > 0) {
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      } else if (event.key === 'Escape') {
        event.preventDefault();
        close();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        handleNext();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        handlePrev();
      }
    };

    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, close, handleNext, handlePrev]);

  useEffect(() => {
    if (!open) return;

    if (highlightRef.current) {
      highlightRef.current.removeAttribute('data-help-highlight');
      highlightRef.current = null;
    }

    const current = steps[index];
    if (!current?.selector) return;

    const target = document.querySelector<HTMLElement>(current.selector);
    if (!target) return;

    target.setAttribute('data-help-highlight', 'true');
    highlightRef.current = target;
    target.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });

    return () => {
      if (highlightRef.current === target) {
        highlightRef.current.removeAttribute('data-help-highlight');
        highlightRef.current = null;
      } else {
        target.removeAttribute('data-help-highlight');
      }
    };
  }, [open, index, steps]);

  if (!open || steps.length === 0) {
    return null;
  }

  const step = steps[index];
  const isLastStep = index === steps.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-80 px-4 py-6">
        <div
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="w-full max-w-lg rounded-lg bg-gray-900 text-white shadow-2xl focus:outline-none"
        >
          <header className="flex items-start justify-between border-b border-white/10 px-4 py-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ub-yellow">
                Guided tour
              </p>
              <h2 id={titleId} className="text-lg font-bold">
                {title}
              </h2>
            </div>
            <button
              type="button"
              onClick={close}
              className="ml-2 rounded px-2 py-1 text-sm transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ub-yellow"
              aria-label="Close tutorial"
            >
              ×
            </button>
          </header>
          <div className="px-4 py-3 space-y-3">
            <div className="text-sm font-semibold text-ub-yellow">{step.title}</div>
            <div className="text-sm leading-relaxed text-gray-100">{step.body}</div>
            {step.tip && (
              <p className="rounded border-l-4 border-ub-yellow bg-white/5 px-3 py-2 text-xs text-gray-200">
                {step.tip}
              </p>
            )}
          </div>
          <footer className="flex items-center justify-between border-t border-white/10 px-4 py-3 text-xs text-gray-300">
            <span>
              Step {index + 1} of {steps.length}
            </span>
            <div className="flex space-x-2">
              <button
                type="button"
                onClick={handlePrev}
                disabled={index === 0}
                className="rounded px-3 py-1 text-sm transition hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-ub-yellow disabled:opacity-50 disabled:hover:bg-transparent"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={isLastStep ? close : handleNext}
                className="rounded bg-ub-yellow px-3 py-1 text-sm font-semibold text-black transition hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-ub-yellow"
              >
                {isLastStep ? finishLabel : 'Next'}
              </button>
            </div>
          </footer>
        </div>
      </div>
      <style jsx global>{`
        [data-help-highlight='true'] {
          position: relative !important;
          z-index: 70 !important;
          box-shadow: 0 0 0 3px rgba(250, 204, 21, 0.95), 0 0 0 6px rgba(17, 24, 39, 0.6);
          border-radius: 0.5rem;
        }
      `}</style>
    </>
  );
};

export default HelpOverlay;
