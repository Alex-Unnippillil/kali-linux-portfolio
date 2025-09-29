import { useEffect, useState } from 'react';

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

function detectKeyboardSupport(): boolean {
  if (typeof window === 'undefined') return true;
  try {
    if (typeof window.matchMedia === 'function') {
      const hoverQuery = window.matchMedia('(any-hover: hover)');
      if (hoverQuery.matches) return true;
      const finePointerQuery = window.matchMedia('(any-pointer: fine)');
      if (finePointerQuery.matches) return true;
    }
  } catch (error) {
    // ignore matchMedia errors
  }
  if (typeof navigator !== 'undefined' && 'keyboard' in navigator) {
    return true;
  }
  return false;
}

export default function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean = true) {
  const [keyboardAvailable, setKeyboardAvailable] = useState<boolean>(() => detectKeyboardSupport());

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const queries = ['(any-hover: hover)', '(any-pointer: fine)']
      .map((query) => {
        try {
          return window.matchMedia(query);
        } catch (error) {
          return null;
        }
      })
      .filter(Boolean) as MediaQueryList[];

    if (!queries.length) return;

    const update = () => {
      setKeyboardAvailable(detectKeyboardSupport());
    };

    queries.forEach((mediaQuery) => {
      if (typeof mediaQuery.addEventListener === 'function') {
        mediaQuery.addEventListener('change', update);
      } else if (typeof mediaQuery.addListener === 'function') {
        mediaQuery.addListener(update);
      }
    });

    return () => {
      queries.forEach((mediaQuery) => {
        if (typeof mediaQuery.removeEventListener === 'function') {
          mediaQuery.removeEventListener('change', update);
        } else if (typeof mediaQuery.removeListener === 'function') {
          mediaQuery.removeListener(update);
        }
      });
    };
  }, []);

  useEffect(() => {
    const node = ref.current;
    if (!node || !active || !keyboardAvailable) return;

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
    };
  }, [ref, active, keyboardAvailable]);
}
