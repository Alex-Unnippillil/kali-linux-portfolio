import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
];

const getFocusableElements = (container: HTMLElement) =>
  Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS.join(',')),
  ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');

const focusElement = (el: HTMLElement | null | undefined) => {
  if (!el || typeof el.focus !== 'function') return;
  try {
    el.focus({ preventScroll: true });
  } catch {
    el.focus();
  }
};

export interface FocusTrapOptions {
  active: boolean;
  containerRef: RefObject<HTMLElement>;
  initialFocusRef?: RefObject<HTMLElement>;
  onEscape?: () => void;
  returnFocusRef?: RefObject<HTMLElement>;
}

const useFocusTrapInternal = ({
  active,
  containerRef,
  initialFocusRef,
  onEscape,
  returnFocusRef,
}: FocusTrapOptions) => {
  useEffect(() => {
    if (!active) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = getFocusableElements(container);
    const initialTarget = initialFocusRef?.current || focusable[0] || container;

    focusElement(initialTarget);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (onEscape) {
          event.preventDefault();
          onEscape();
        }
        return;
      }

      if (event.key !== 'Tab') return;

      const elements = getFocusableElements(container);
      if (elements.length === 0) {
        event.preventDefault();
        focusElement(container);
        return;
      }

      const first = elements[0];
      const last = elements[elements.length - 1];
      const activeElement = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!container.contains(activeElement) || activeElement === first) {
          event.preventDefault();
          focusElement(last);
        }
      } else if (!event.shiftKey) {
        if (!container.contains(activeElement) || activeElement === last) {
          event.preventDefault();
          focusElement(first);
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
      const returnTarget = returnFocusRef?.current || previouslyFocused;
      focusElement(returnTarget || null);
    };
  }, [active, containerRef, initialFocusRef, onEscape, returnFocusRef]);
};

function useFocusTrap(containerRef: RefObject<HTMLElement>, active: boolean): void;
function useFocusTrap(options: FocusTrapOptions): void;
function useFocusTrap(
  arg1: RefObject<HTMLElement> | FocusTrapOptions,
  arg2?: boolean,
): void {
  if (typeof arg2 === 'boolean') {
    useFocusTrapInternal({
      active: arg2,
      containerRef: arg1 as RefObject<HTMLElement>,
    });
    return;
  }

  useFocusTrapInternal(arg1 as FocusTrapOptions);
}

export { useFocusTrapInternal };

export default useFocusTrap;
