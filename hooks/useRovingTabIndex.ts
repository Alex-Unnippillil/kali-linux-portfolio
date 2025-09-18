import { useEffect } from 'react';

/**
 * Enables roving tab index and arrow key navigation within a container.
 * Elements inside the container that have role="tab", role="menuitem",
 * or role="option" will participate in the roving behaviour. This covers
 * common patterns such as tabs, menus and listboxes.
 */
interface RovingOptions {
  selectors?: string;
}

export default function useRovingTabIndex(
  ref: React.RefObject<HTMLElement>,
  active: boolean = true,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
  options: RovingOptions = {}
) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const selectors =
      options.selectors ||
      '[role="tab"], [role="menuitem"], [role="option"], [role="radio"], [role="treeitem"]';

    const filterVisible = (elements: HTMLElement[]) =>
      elements.filter((el) => {
        if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') {
          return false;
        }
        if (el.closest('[hidden]')) return false;
        if (el.closest('[aria-hidden="true"]')) return false;
        return true;
      });

    const getItems = () =>
      filterVisible(Array.from(node.querySelectorAll<HTMLElement>(selectors)));

    let items = getItems();
    if (items.length === 0) return;

    let index = items.findIndex((el) => el.tabIndex === 0);
    if (index === -1) index = 0;
    items.forEach((el, i) => (el.tabIndex = i === index ? 0 : -1));

    const handleKey = (e: KeyboardEvent) => {
      const forward =
        orientation === 'horizontal'
          ? ['ArrowRight', 'ArrowDown']
          : ['ArrowDown'];
      const backward =
        orientation === 'horizontal'
          ? ['ArrowLeft', 'ArrowUp']
          : ['ArrowUp'];
      if (!forward.includes(e.key) && !backward.includes(e.key)) return;

      const visibleItems = getItems();
      if (visibleItems.length === 0) return;

      items = visibleItems;
      const focused = items.findIndex((el) => el.tabIndex === 0 && el === document.activeElement);
      if (focused >= 0) {
        index = focused;
      }

      e.preventDefault();
      if (forward.includes(e.key)) {
        index = (index + 1) % items.length;
      } else {
        index = (index - 1 + items.length) % items.length;
      }
      items.forEach((el, i) => (el.tabIndex = i === index ? 0 : -1));
      items[index].focus();
    };

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      const visibleItems = getItems();
      if (visibleItems.length === 0) return;
      items = visibleItems;
      const focused = items.findIndex((el) => el === target);
      if (focused === -1) return;
      index = focused;
      items.forEach((el, i) => (el.tabIndex = i === index ? 0 : -1));
    };

    node.addEventListener('keydown', handleKey);
    node.addEventListener('focusin', handleFocusIn);
    return () => {
      node.removeEventListener('keydown', handleKey);
      node.removeEventListener('focusin', handleFocusIn);
    };
  }, [ref, active, orientation, options.selectors]);
}
