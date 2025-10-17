import { RefObject, useEffect } from 'react';

export const FOCUSABLE_SELECTOR = [
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

export const isElementFocusable = (element: HTMLElement) => {
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

      const fallbackFirst = focusable[0];

      if (fallbackFirst && fallbackFirst !== candidate) {
        fallbackFirst.focus({ preventScroll: true });
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
    const restoreTargetFromRef = restoreFocusRef?.current ?? null;

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
      const preferredFirst = initialFocusRef?.current;
      const isPreferredFocusable =
        preferredFirst && container.contains(preferredFirst) && isElementFocusable(preferredFirst);
      const eventTarget = event.target as HTMLElement | null;
      const isTargetWithinContainer = !!eventTarget && container.contains(eventTarget);
      const isTargetFirst =
        isTargetWithinContainer &&
        (eventTarget === first || (isPreferredFocusable && eventTarget === preferredFirst));
      const isTargetLast = isTargetWithinContainer && eventTarget === last;
      const current = document.activeElement as HTMLElement | null;
      const shouldWrapToLast =
        !current ||
        !container.contains(current) ||
        current === first ||
        (isPreferredFocusable && current === preferredFirst) ||
        isTargetFirst;
      const wrapToFirstTarget = isPreferredFocusable ? preferredFirst : first;

      if (event.shiftKey) {
        if (shouldWrapToLast) {
          event.preventDefault();
          last.focus({ preventScroll: true });
        }
        return;
      }

      if (!current || !container.contains(current) || current === last || isTargetLast) {
        event.preventDefault();
        wrapToFirstTarget?.focus({ preventScroll: true });
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keydown', handleKeyDown, true);
    const elementListeners = new Map<HTMLElement, (event: KeyboardEvent) => void>();

    const syncElementListeners = () => {
      const focusableElements = getFocusableElements();
      const focusableSet = new Set(focusableElements);

      focusableElements.forEach((element) => {
        if (elementListeners.has(element)) {
          return;
        }

        const listener = (event: KeyboardEvent) => {
          handleKeyDown(event);
        };

        element.addEventListener('keydown', listener);
        elementListeners.set(element, listener);
      });

      elementListeners.forEach((listener, element) => {
        if (focusableSet.has(element)) {
          return;
        }

        element.removeEventListener('keydown', listener);
        elementListeners.delete(element);
      });

    };

    syncElementListeners();

    const observer = new MutationObserver(() => {
      syncElementListeners();
    });

    observer.observe(container, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['tabindex', 'disabled', 'aria-hidden'],
    });
    const handleFocus = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || container.contains(target)) {
        return;
      }

      const focusableElements = getFocusableElements();

      if (focusableElements.length === 0) {
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];
      const preferredFirst = initialFocusRef?.current;
      const isPreferredFocusable =
        preferredFirst && container.contains(preferredFirst) && isElementFocusable(preferredFirst);
      const wrapToFirstTarget = isPreferredFocusable ? preferredFirst : first;
      const previous = event.relatedTarget as HTMLElement | null;

      if (previous && container.contains(previous)) {
        if (previous === first || (isPreferredFocusable && previous === preferredFirst)) {
          last.focus({ preventScroll: true });
          return;
        }

        if (previous === last) {
          wrapToFirstTarget?.focus({ preventScroll: true });
          return;
        }
      }

      wrapToFirstTarget?.focus({ preventScroll: true });
    };

    window.addEventListener('focus', handleFocus, true);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.clearTimeout(timeoutId);
      window.clearInterval(intervalId);
      container.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keydown', handleKeyDown, true);
      observer.disconnect();
      elementListeners.forEach((listener, element) => {
        element.removeEventListener('keydown', listener);
      });
      window.removeEventListener('focus', handleFocus, true);

      const restoreTarget = restoreTargetFromRef ?? previouslyFocused;

      if (restoreTarget && restoreTarget.isConnected) {
        restoreTarget.focus({ preventScroll: true });
      }
    };
  }, [active, containerRef, initialFocusRef, restoreFocusRef]);
};

export default useFocusTrap;
