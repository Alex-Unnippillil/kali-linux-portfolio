import { useEffect, useRef } from 'react';
import type { MutableRefObject, RefObject } from 'react';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ];
  return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(',')));
}

export interface FocusTrapOptions {
  /**
   * Automatically focus the first focusable element when the trap becomes
   * active. Defaults to true because most popovers/dialogs should transfer
   * focus on open.
   */
  focusFirstOnActivate?: boolean;
  /**
   * Restore focus to the element that was focused before the trap activated
   * once it deactivates. Enabled by default.
   */
  restoreFocus?: boolean;
}

type FocusTrapRef = RefObject<HTMLElement | null> | MutableRefObject<HTMLElement | null>;

export default function useFocusTrap(
  ref: FocusTrapRef,
  active: boolean = true,
  options: FocusTrapOptions = {},
) {
  const { focusFirstOnActivate = true, restoreFocus = true } = options;
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    if (restoreFocus && previouslyFocused && !node.contains(previouslyFocused)) {
      previousFocusRef.current = previouslyFocused;
    } else if (!restoreFocus) {
      previousFocusRef.current = null;
    }

    if (focusFirstOnActivate) {
      const focusable = getFocusableElements(node);
      const target = focusable[0] ?? node;
      if (!node.contains(document.activeElement) && typeof target?.focus === 'function') {
        target.focus();
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements(node);
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    const handleFocus = (e: FocusEvent) => {
      if (!node.contains(e.target as Node)) {
        const focusable = getFocusableElements(node);
        focusable[0]?.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
      if (restoreFocus) {
        const previous = previousFocusRef.current;
        if (previous && previous.isConnected) {
          previous.focus();
        }
        previousFocusRef.current = null;
      }
    };
  }, [ref, active, focusFirstOnActivate, restoreFocus]);
}
