import { useEffect } from 'react';
import type { MutableRefObject, RefObject } from 'react';

/**
 * Enables roving tab index and arrow key navigation within a container.
 * Elements inside the container that have role="tab", role="menuitem",
 * or role="option" will participate in the roving behaviour. This covers
 * common patterns such as tabs, menus and listboxes.
 */
type RovingRef = RefObject<HTMLElement | null> | MutableRefObject<HTMLElement | null>;

export default function useRovingTabIndex(
  ref: RovingRef,
  active: boolean = true,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const items = Array.from(
      node.querySelectorAll<HTMLElement>(
        '[role="tab"], [role="menuitem"], [role="option"]'
      )
    );
    if (items.length === 0) return;

    let index = items.findIndex((el) => el.tabIndex === 0);
    if (index === -1) index = 0;
    items.forEach((el, i) => (el.tabIndex = i === index ? 0 : -1));
    if (!node.contains(document.activeElement)) {
      items[index].focus();
    }

    const handleKey = (e: KeyboardEvent) => {
      const forward =
        orientation === 'horizontal'
          ? ['ArrowRight', 'ArrowDown']
          : ['ArrowDown', 'ArrowRight'];
      const backward =
        orientation === 'horizontal'
          ? ['ArrowLeft', 'ArrowUp']
          : ['ArrowUp', 'ArrowLeft'];
      if (forward.includes(e.key)) {
        e.preventDefault();
        index = (index + 1) % items.length;
        items.forEach((el, i) => (el.tabIndex = i === index ? 0 : -1));
        items[index].focus();
      } else if (backward.includes(e.key)) {
        e.preventDefault();
        index = (index - 1 + items.length) % items.length;
        items.forEach((el, i) => (el.tabIndex = i === index ? 0 : -1));
        items[index].focus();
      }
    };

    node.addEventListener('keydown', handleKey);
    return () => {
      node.removeEventListener('keydown', handleKey);
    };
  }, [ref, active, orientation]);
}
