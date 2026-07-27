import type { KeyboardEvent } from 'react';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export type ScrollAlignment = 'auto' | 'start' | 'end';

export interface UseVirtualListNavigationOptions {
  itemCount: number;
  getItemElement: (index: number) => HTMLElement | null;
  scrollToIndex: (index: number, align?: ScrollAlignment) => void;
  estimatePageSize: () => number;
}

export interface VirtualListNavigation {
  focusedIndex: number;
  handleKeyDown: (event: KeyboardEvent) => void;
  focusItem: (index: number, align?: ScrollAlignment) => void;
  onItemFocus: (index: number) => void;
}

const clampIndex = (index: number, max: number) => {
  if (max <= 0) {
    return -1;
  }

  if (index < 0) {
    return 0;
  }

  if (index > max - 1) {
    return max - 1;
  }

  return index;
};

export function useVirtualListNavigation({
  itemCount,
  getItemElement,
  scrollToIndex,
  estimatePageSize,
}: UseVirtualListNavigationOptions): VirtualListNavigation {
  const [focusedIndex, setFocusedIndex] = useState(0);
  const pendingFocusRef = useRef<number | null>(null);

  const focusItem = useCallback(
    (index: number, align: ScrollAlignment = 'auto') => {
      if (itemCount === 0) {
        return;
      }

      const target = clampIndex(index, itemCount);
      setFocusedIndex(target);
      pendingFocusRef.current = target;
      scrollToIndex(target, align);
    },
    [itemCount, scrollToIndex]
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (itemCount === 0) {
        return;
      }

      if (
        event.key !== 'PageDown' &&
        event.key !== 'PageUp' &&
        event.key !== 'Home' &&
        event.key !== 'End'
      ) {
        return;
      }

      event.preventDefault();

      const pageSize = Math.max(1, estimatePageSize());
      let nextIndex = focusedIndex;
      let align: ScrollAlignment = 'auto';

      switch (event.key) {
        case 'PageDown':
          nextIndex = clampIndex(focusedIndex + pageSize, itemCount);
          align = 'end';
          break;
        case 'PageUp':
          nextIndex = clampIndex(focusedIndex - pageSize, itemCount);
          align = 'start';
          break;
        case 'Home':
          nextIndex = 0;
          align = 'start';
          break;
        case 'End':
          nextIndex = itemCount - 1;
          align = 'end';
          break;
        default:
          break;
      }

      if (nextIndex !== focusedIndex) {
        focusItem(nextIndex, align);
      }
    },
    [estimatePageSize, focusItem, focusedIndex, itemCount]
  );

  const onItemFocus = useCallback((index: number) => {
    pendingFocusRef.current = null;
    setFocusedIndex(index);
  }, []);

  useEffect(() => {
    if (itemCount === 0) {
      pendingFocusRef.current = null;
      setFocusedIndex(0);
      return;
    }

    if (focusedIndex > itemCount - 1) {
      const next = itemCount - 1;
      pendingFocusRef.current = next;
      setFocusedIndex(next);
    }
  }, [focusedIndex, itemCount]);

  useLayoutEffect(() => {
    const target = pendingFocusRef.current;
    if (target == null) {
      return;
    }

    const element = getItemElement(target);
    if (element && element !== document.activeElement) {
      element.focus();
    }

    if (element) {
      pendingFocusRef.current = null;
    }
  }, [focusedIndex, getItemElement, itemCount]);

  return {
    focusedIndex: itemCount === 0 ? -1 : focusedIndex,
    handleKeyDown,
    focusItem,
    onItemFocus,
  };
}

