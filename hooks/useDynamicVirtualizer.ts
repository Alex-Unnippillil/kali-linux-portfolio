import { useCallback, useMemo, type RefObject } from 'react';
import {
  useVirtualizer,
  type UseVirtualizerOptions,
  type Virtualizer,
} from '@tanstack/react-virtual';

type ElementOrNull = HTMLElement | null;

type DynamicVirtualizerOptions<T extends Element> = {
  /**
   * Total number of rows/items in the list.
   */
  count: number;
  /**
   * Reference to the scroll container that the virtualizer should observe.
   */
  scrollRef: RefObject<T>;
  /**
   * Optional estimated height callback to help the virtualizer predict layout
   * before measuring real DOM nodes.
   */
  estimateSize?: UseVirtualizerOptions<T, Element>['estimateSize'];
  /**
   * Number of extra items to render above and below the viewport.
   */
  overscan?: number;
};

type MeasureElement = (element: ElementOrNull) => void;

type DynamicVirtualizerReturn<T extends Element> = {
  /**
   * The underlying tanstack virtualizer instance.
   */
  virtualizer: Virtualizer<T, Element>;
  /**
   * Helper callback that can be attached to the `ref` prop of each row in the
   * virtualized list so the virtualizer can measure dynamic heights.
   */
  measureElement: MeasureElement;
};

/**
 * Wrapper around `@tanstack/react-virtual` that standardises dynamic height
 * measurement and null-safe access to the scroll container. It enables list
 * heavy components to opt-into virtualization without duplicating boilerplate.
 */
export function useDynamicVirtualizer<T extends Element>({
  count,
  estimateSize,
  overscan = 6,
  scrollRef,
}: DynamicVirtualizerOptions<T>): DynamicVirtualizerReturn<T> {
  const virtualizer = useVirtualizer<T, Element>({
    count,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan,
    measureElement: (element) =>
      element instanceof HTMLElement ? element.getBoundingClientRect().height : 0,
  });

  const measureElement: MeasureElement = useCallback(
    (element) => {
      if (element) {
        virtualizer.measureElement(element);
      }
    },
    [virtualizer],
  );

  return useMemo(
    () => ({
      virtualizer,
      measureElement,
    }),
    [virtualizer, measureElement],
  );
}

export default useDynamicVirtualizer;
