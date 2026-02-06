import { useEffect, useRef } from 'react';

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
  const typeaheadRef = useRef('');
  const typeaheadTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !active) return;

    const getItems = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          '[role="tab"], [role="menuitem"], [role="option"]'
        )
      ).filter((el) => !el.hasAttribute('disabled') && el.getAttribute('aria-disabled') !== 'true');

    let items = getItems();
    if (items.length === 0) return;

    const setFocusedIndex = (nextIndex: number) => {
      items = getItems();
      if (items.length === 0) {
        return;
      }

      const clampedIndex = ((nextIndex % items.length) + items.length) % items.length;
      items.forEach((el, i) => {
        el.tabIndex = i === clampedIndex ? 0 : -1;
      });

      const candidate = items[clampedIndex];
      if (candidate) {
        candidate.focus({ preventScroll: true });
        currentIndex = clampedIndex;
      }
    };

    const resetTypeahead = () => {
      typeaheadRef.current = '';
      if (typeaheadTimeoutRef.current) {
        window.clearTimeout(typeaheadTimeoutRef.current);
        typeaheadTimeoutRef.current = null;
      }
    };

    const scheduleTypeaheadReset = () => {
      if (typeaheadTimeoutRef.current) {
        window.clearTimeout(typeaheadTimeoutRef.current);
      }
      typeaheadTimeoutRef.current = window.setTimeout(() => {
        typeaheadRef.current = '';
        typeaheadTimeoutRef.current = null;
      }, 400);
    };

    let currentIndex = items.findIndex((el) => el.tabIndex === 0);
    if (currentIndex === -1) {
      currentIndex = 0;
    }
    setFocusedIndex(currentIndex);

    const isPrintableKey = (event: KeyboardEvent) => {
      return (
        event.key.length === 1 &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey
      );
    };

    const findMatchIndex = (search: string) => {
      const lowerSearch = search.toLowerCase();
      const availableItems = getItems();
      if (availableItems.length === 0) {
        return -1;
      }

      const startIndex = search.length === 1 ? (currentIndex + 1) % availableItems.length : 0;
      for (let offset = 0; offset < availableItems.length; offset += 1) {
        const candidateIndex = (startIndex + offset) % availableItems.length;
        const text = availableItems[candidateIndex].textContent?.trim().toLowerCase() ?? '';
        if (text.startsWith(lowerSearch)) {
          return candidateIndex;
        }
      }

      return -1;
    };

    const handleKey = (event: KeyboardEvent) => {
      items = getItems();
      if (items.length === 0) return;

      const verticalForwardKeys = ['ArrowDown'];
      const verticalBackwardKeys = ['ArrowUp'];
      const horizontalForwardKeys = ['ArrowRight'];
      const horizontalBackwardKeys = ['ArrowLeft'];

      const forwardKeys =
        orientation === 'horizontal'
          ? [...horizontalForwardKeys, ...verticalForwardKeys]
          : verticalForwardKeys;
      const backwardKeys =
        orientation === 'horizontal'
          ? [...horizontalBackwardKeys, ...verticalBackwardKeys]
          : verticalBackwardKeys;

      if (forwardKeys.includes(event.key)) {
        event.preventDefault();
        setFocusedIndex(currentIndex + 1);
        resetTypeahead();
        return;
      }

      if (backwardKeys.includes(event.key)) {
        event.preventDefault();
        setFocusedIndex(currentIndex - 1);
        resetTypeahead();
        return;
      }

      if (event.key === 'Home') {
        event.preventDefault();
        setFocusedIndex(0);
        resetTypeahead();
        return;
      }

      if (event.key === 'End') {
        event.preventDefault();
        setFocusedIndex(items.length - 1);
        resetTypeahead();
        return;
      }

      if (isPrintableKey(event)) {
        typeaheadRef.current += event.key.toLowerCase();
        scheduleTypeaheadReset();

        const bufferedMatch = findMatchIndex(typeaheadRef.current);

        if (bufferedMatch >= 0) {
          setFocusedIndex(bufferedMatch);
          return;
        }

        if (typeaheadRef.current.length > 1) {
          const singleChar = typeaheadRef.current.slice(-1);
          const singleCharMatch = findMatchIndex(singleChar);
          if (singleCharMatch >= 0) {
            typeaheadRef.current = singleChar;
            setFocusedIndex(singleCharMatch);
            return;
          }
        }

        return;
      }

      if (event.key === 'Escape') {
        resetTypeahead();
      }
    };

    node.addEventListener('keydown', handleKey);

    return () => {
      node.removeEventListener('keydown', handleKey);
      resetTypeahead();
    };
  }, [ref, active, orientation]);
}
