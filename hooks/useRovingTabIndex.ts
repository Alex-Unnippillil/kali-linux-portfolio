import { useEffect } from 'react';

const SELECTOR =
  '[data-roving-focus="true"], [role="tab"], [role="menuitem"], [role="option"], [role="gridcell"]';

type Orientation = 'horizontal' | 'vertical' | 'grid';

const isDisabled = (element: HTMLElement) => {
  if (element.getAttribute('aria-disabled') === 'true') return true;
  if (element.hasAttribute('disabled')) return true;
  return false;
};

const coerceNumber = (value: string | null): number | undefined => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export default function useRovingTabIndex(
  ref: React.RefObject<HTMLElement>,
  active: boolean = true,
  orientation: Orientation = 'horizontal'
) {
  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const getItems = () =>
      Array.from(node.querySelectorAll<HTMLElement>(SELECTOR)).filter(
        (el) => !isDisabled(el)
      );

    let items = getItems();
    if (items.length === 0) return;

    let index = 0;

    const setTabIndex = () => {
      items.forEach((el, i) => {
        el.tabIndex = i === index ? 0 : -1;
      });
    };

    const focusItem = () => {
      if (!items[index]) return;
      setTabIndex();
      items[index].focus();
    };

    const dataColumns = coerceNumber(node.getAttribute('data-roving-columns'));

    const computeColumns = () => {
      if (orientation !== 'grid') return 1;
      if (items.length <= 1) return 1;

      const rects = items.map((item) => item.getBoundingClientRect());
      const firstTop = rects[0]?.top ?? 0;
      let columns = 1;
      const tolerance = 5;
      for (let i = 1; i < rects.length; i += 1) {
        if (Math.abs(rects[i].top - firstTop) <= tolerance) {
          columns += 1;
        } else {
          break;
        }
      }

      if (columns === items.length && columns > 1) {
        if (dataColumns && dataColumns > 0) {
          columns = Math.min(dataColumns, items.length);
        } else {
          columns = Math.max(1, Math.min(items.length, Math.round(Math.sqrt(items.length))));
        }
      }

      return Math.max(1, columns);
    };

    index = items.findIndex(
      (el) => el === document.activeElement || el.tabIndex === 0
    );
    if (index === -1) index = 0;
    setTabIndex();

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      items = getItems();
      const nextIndex = items.indexOf(target);
      if (nextIndex !== -1) {
        index = nextIndex;
        setTabIndex();
      }
    };

    const handleKey = (event: KeyboardEvent) => {
      if (!items.length) return;
      items = getItems();
      if (!items.length) return;
      if (index >= items.length) index = items.length - 1;

      const commit = () => {
        focusItem();
      };

      if (orientation === 'grid') {
        const columns = computeColumns();
        if (event.key === 'ArrowRight') {
          event.preventDefault();
          index = (index + 1) % items.length;
          commit();
        } else if (event.key === 'ArrowLeft') {
          event.preventDefault();
          index = (index - 1 + items.length) % items.length;
          commit();
        } else if (event.key === 'ArrowDown') {
          event.preventDefault();
          let nextIndex = index + columns;
          if (nextIndex >= items.length) {
            nextIndex = index % columns;
            while (nextIndex >= items.length && nextIndex >= 0) {
              nextIndex -= columns;
            }
            if (nextIndex < 0) nextIndex = index % columns;
          }
          index = Math.max(0, nextIndex);
          commit();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          let nextIndex = index - columns;
          if (nextIndex < 0) {
            const column = index % columns;
            const rows = Math.ceil(items.length / columns);
            nextIndex = column + columns * (rows - 1);
            while (nextIndex >= items.length && nextIndex >= 0) {
              nextIndex -= columns;
            }
          }
          index = Math.max(0, nextIndex);
          commit();
        }
        return;
      }

      const forward =
        orientation === 'horizontal'
          ? ['ArrowRight', 'ArrowDown']
          : ['ArrowDown'];
      const backward =
        orientation === 'horizontal'
          ? ['ArrowLeft', 'ArrowUp']
          : ['ArrowUp'];

      if (forward.includes(event.key)) {
        event.preventDefault();
        index = (index + 1) % items.length;
        commit();
      } else if (backward.includes(event.key)) {
        event.preventDefault();
        index = (index - 1 + items.length) % items.length;
        commit();
      }
    };

    const handleMutation = () => {
      items = getItems();
      if (!items.length) return;
      if (index >= items.length) index = items.length - 1;
      setTabIndex();
    };

    const observer = new MutationObserver(handleMutation);
    observer.observe(node, { childList: true, subtree: true });

    node.addEventListener('focusin', handleFocusIn);
    node.addEventListener('keydown', handleKey);

    return () => {
      observer.disconnect();
      node.removeEventListener('focusin', handleFocusIn);
      node.removeEventListener('keydown', handleKey);
    };
  }, [ref, active, orientation]);
}
