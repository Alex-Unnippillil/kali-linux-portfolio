import { useEffect } from 'react';

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    '[role="menuitem"]',
    '[role="menuitemcheckbox"]',
    '[role="menuitemradio"]',
    '[tabindex]:not([tabindex="-1"])'
  ];
  return Array.from(container.querySelectorAll<HTMLElement>(selectors.join(','))).filter(
    (el) =>
      !el.hasAttribute('disabled') &&
      el.getAttribute('aria-disabled') !== 'true' &&
      el.getAttribute('data-roving-disabled') !== 'true'
  );
}

function updateRovingState(container: HTMLElement, activeElement: HTMLElement) {
  const rovingCandidates = Array.from(
    container.querySelectorAll<HTMLElement>(
      '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]'
    )
  );

  rovingCandidates.forEach((item) => {
    if (
      item.hasAttribute('disabled') ||
      item.getAttribute('aria-disabled') === 'true' ||
      item.getAttribute('data-roving-disabled') === 'true'
    ) {
      item.tabIndex = -1;
      return;
    }

    item.tabIndex = item === activeElement ? 0 : -1;
  });
}

export default function useFocusTrap(ref: React.RefObject<HTMLElement>, active: boolean = true) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const focusable = getFocusableElements(node);
      if (focusable.length === 0) return;

      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      const lastIndex = focusable.length - 1;
      const fallbackIndex = e.shiftKey ? lastIndex : 0;
      let nextIndex = currentIndex === -1 ? fallbackIndex : currentIndex;

      if (e.shiftKey) {
        nextIndex = currentIndex <= 0 ? lastIndex : currentIndex - 1;
      } else {
        nextIndex = currentIndex === lastIndex ? 0 : currentIndex + 1;
      }

      e.preventDefault();
      const next = focusable[nextIndex] ?? focusable[fallbackIndex];
      if (next) {
        next.focus();
        updateRovingState(node, next);
      }
    };

    const handleFocus = (e: FocusEvent) => {
      if (!node.contains(e.target as Node)) {
        const focusable = getFocusableElements(node);
        const first = focusable[0];
        if (first) {
          first.focus();
          updateRovingState(node, first);
        }
      } else {
        updateRovingState(node, e.target as HTMLElement);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('focusin', handleFocus);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('focusin', handleFocus);
    };
  }, [ref, active]);
}
