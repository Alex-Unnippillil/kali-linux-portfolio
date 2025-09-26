import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type FocusTrapOptions = {
  initialFocusRef?: RefObject<HTMLElement> | null;
  onEscape?: () => void;
  returnFocus?: boolean;
};

export function useFocusTrap(
  active: boolean,
  containerRef: RefObject<HTMLElement>,
  { initialFocusRef, onEscape, returnFocus = true }: FocusTrapOptions = {},
) {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusTarget = initialFocusRef?.current ?? container;
    if (focusTarget && typeof focusTarget.focus === 'function') {
      focusTarget.focus({ preventScroll: true });
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (onEscape) {
          onEscape();
        }
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS),
      ).filter((el) => !el.hasAttribute('aria-hidden') && el.tabIndex !== -1);
      if (focusable.length === 0) {
        event.preventDefault();
        container.focus({ preventScroll: true });
        return;
      }

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      let nextIndex = currentIndex;
      if (event.shiftKey) {
        nextIndex = currentIndex <= 0 ? focusable.length - 1 : currentIndex - 1;
      } else {
        nextIndex = currentIndex === focusable.length - 1 ? 0 : currentIndex + 1;
      }

      focusable[nextIndex].focus();
      event.preventDefault();
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      if (returnFocus && previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef, initialFocusRef, onEscape, returnFocus]);
}

export default useFocusTrap;
