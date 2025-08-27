import { useEffect } from 'react';

/**
 * Enables roving tab index and arrow key navigation within a container.
 * Elements inside the container that have role="tab" or role="menuitem"
 * will participate in the roving behaviour.
 */
export default function useRovingTabIndex(
  ref: React.RefObject<HTMLElement>,
  active: boolean = true,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const items = Array.from(
      node.querySelectorAll<HTMLElement>('[role="tab"], [role="menuitem"]')
    );
    if (items.length === 0) return;

    let index = items.findIndex((el) => el.tabIndex === 0);
    if (index === -1) index = 0;
    items.forEach((el, i) => (el.tabIndex = i === index ? 0 : -1));

    const handleKey = (e: KeyboardEvent) => {
      const forward = orientation === 'horizontal' ? ['ArrowRight', 'ArrowDown'] : ['ArrowDown'];
      const backward = orientation === 'horizontal' ? ['ArrowLeft', 'ArrowUp'] : ['ArrowUp'];
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
