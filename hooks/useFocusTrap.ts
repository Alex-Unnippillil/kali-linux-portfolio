import { useEffect } from 'react';

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

export default function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean = true) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = getFocusableElements(node);
    (focusable[0] || node).focus();

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
      previouslyFocused?.focus();
    };
  }, [ref, active]);
}
