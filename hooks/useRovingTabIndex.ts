import { useEffect } from 'react';

/**
 * Enables roving tab index and arrow key navigation within a container.
 * Elements inside the container that have role="tab", role="menuitem",
 * or role="option" will participate in the roving behaviour. This covers
 * common patterns such as tabs, menus and listboxes.
 */
export default function useRovingTabIndex(
  ref: React.RefObject<HTMLElement>,
  active: boolean = true,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const selector = [
      '[role="tab"]',
      '[role="menuitem"]',
      '[role="menuitemradio"]',
      '[role="menuitemcheckbox"]',
      '[role="option"]',
      '[role="separator"]',
      '[data-roving-focus="true"]',
    ].join(', ');

    const entries = Array.from(
      node.querySelectorAll<HTMLElement>(selector)
    ).map((element) => {
      const role = element.getAttribute('role');
      const ariaDisabled = element.getAttribute('aria-disabled');
      const disabledAttr = (element as HTMLButtonElement).disabled;
      const inert = role === 'separator';
      const disabled = inert || disabledAttr || ariaDisabled === 'true';
      return { element, disabled, inert };
    });

    if (entries.length === 0) return;

    let focusIndex = entries.findIndex((entry) => !entry.disabled);
    if (focusIndex === -1) {
      // No enabled items. Ensure everything is unfocusable and bail.
      entries.forEach((entry) => {
        entry.element.tabIndex = -1;
      });
      return;
    }

    const setFocusIndex = (nextIndex: number) => {
      focusIndex = nextIndex;
      entries.forEach((entry, index) => {
        entry.element.tabIndex = index === focusIndex ? 0 : -1;
      });
      entries[focusIndex].element.focus();
    };

    entries.forEach((entry, index) => {
      entry.element.tabIndex = index === focusIndex ? 0 : -1;
    });

    const forwardKeys =
      orientation === 'horizontal'
        ? ['ArrowRight', 'ArrowDown']
        : ['ArrowDown', 'ArrowRight'];
    const backwardKeys =
      orientation === 'horizontal'
        ? ['ArrowLeft', 'ArrowUp']
        : ['ArrowUp', 'ArrowLeft'];

    const moveFocus = (direction: 1 | -1) => {
      if (!entries.length) return;
      let nextIndex = focusIndex;
      for (let attempt = 0; attempt < entries.length; attempt += 1) {
        nextIndex = (nextIndex + direction + entries.length) % entries.length;
        if (!entries[nextIndex].disabled) {
          setFocusIndex(nextIndex);
          break;
        }
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (forwardKeys.includes(event.key)) {
        event.preventDefault();
        moveFocus(1);
      } else if (backwardKeys.includes(event.key)) {
        event.preventDefault();
        moveFocus(-1);
      }
    };

    node.addEventListener('keydown', handleKey);
    return () => {
      node.removeEventListener('keydown', handleKey);
    };
  }, [ref, active, orientation]);
}
