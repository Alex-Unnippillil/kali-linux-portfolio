import { RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

const isElementFocusable = (element: HTMLElement) => {
  if (element.tabIndex < 0) {
    return false;
  }

  if (element.hasAttribute('disabled')) {
    return false;
  }

  if (element.getAttribute('aria-hidden') === 'true') {
    return false;
  }

  if (element.closest('[aria-hidden="true"]')) {
    return false;
  }

  if (element instanceof HTMLInputElement && element.type === 'hidden') {
    return false;
  }

  return true;
};

type UseFocusTrapOptions = {
  initialFocusRef?: RefObject<HTMLElement | null>;
  restoreFocusRef?: RefObject<HTMLElement | null>;
};

export const useFocusTrap = (
  containerRef: RefObject<HTMLElement | null>,
  active: boolean,
  { initialFocusRef, restoreFocusRef }: UseFocusTrapOptions = {},
) => {
  useEffect(() => {
    if (!active) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    const getFocusableElements = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(isElementFocusable);

    const focusFirstElement = () => {
      const preferred = initialFocusRef?.current;
      const focusable = getFocusableElements();

      const candidate =
        preferred && container.contains(preferred) && isElementFocusable(preferred)
          ? preferred
          : focusable[0];

      if (!candidate) {
        return null;
      }

      candidate.focus();

      if (candidate instanceof HTMLInputElement || candidate instanceof HTMLTextAreaElement) {
        if (typeof candidate.setSelectionRange === 'function') {
          const valueLength = candidate.value.length;
          candidate.setSelectionRange(valueLength, valueLength);
        }
      }

      return candidate;
    };

    const previouslyFocused = document.activeElement as HTMLElement | null;
    const restoreFocusNode = restoreFocusRef?.current ?? null;

    focusFirstElement();

    const ensureFocusInside = () => {
      if (!container.contains(document.activeElement)) {
        focusFirstElement();
      }
    };

    const rafId = window.requestAnimationFrame(ensureFocusInside);

    const timeoutId = window.setTimeout(ensureFocusInside, 120);
    const intervalId = window.setInterval(ensureFocusInside, 50);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const current = document.activeElement as HTMLElement | null;

      if (event.shiftKey) {
        if (!current || !container.contains(current) || current === first) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
        return;
      }

      if (!current || !container.contains(current) || current === last) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    const handleFocus = (event: FocusEvent) => {
      // `window` focus events can have non-Node targets (e.g. Window), which would
      // throw if passed to `Node.contains`. Prefer the actual active element.
      const rawTarget: EventTarget | null = event.target;
      const candidate: Node | null =
        rawTarget instanceof Node ? rawTarget : (document.activeElement instanceof Node ? document.activeElement : null);

      if (!candidate || container.contains(candidate)) {
        return;
      }

      focusFirstElement();
    };

    window.addEventListener('focus', handleFocus, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      container.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('focus', handleFocus, true);

      const restoreTarget = restoreFocusNode ?? previouslyFocused;

      if (restoreTarget && restoreTarget.isConnected) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef, initialFocusRef, restoreFocusRef]);
};

export default useFocusTrap;
