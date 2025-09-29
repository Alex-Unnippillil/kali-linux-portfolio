import { MutableRefObject, useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';

interface UseVirtualListOptions {
  itemCount: number;
  itemHeight: number;
  overscan?: number;
  containerRef: MutableRefObject<HTMLElement | null>;
}

interface VirtualRange {
  start: number;
  end: number;
  offset: number;
  totalHeight: number;
}

export function useVirtualList({
  itemCount,
  itemHeight,
  overscan = 4,
  containerRef,
}: UseVirtualListOptions): VirtualRange {
  const [range, setRange] = useState<VirtualRange>(() => ({
    start: 0,
    end: Math.min(itemCount, overscan),
    offset: 0,
    totalHeight: itemCount * itemHeight,
  }));

  const calculateRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const { scrollTop, clientHeight } = container;
    const visibleCount = Math.ceil(clientHeight / itemHeight);
    const start = Math.max(Math.floor(scrollTop / itemHeight) - overscan, 0);
    const end = Math.min(start + visibleCount + overscan * 2, itemCount);
    setRange({
      start,
      end,
      offset: start * itemHeight,
      totalHeight: itemCount * itemHeight,
    });
  }, [containerRef, itemCount, itemHeight, overscan]);

  useLayoutEffect(() => {
    setRange((prev) => ({
      ...prev,
      totalHeight: itemCount * itemHeight,
    }));
    calculateRange();
  }, [itemCount, itemHeight, calculateRange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const handleScroll = () => calculateRange();
    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => container.removeEventListener('scroll', handleScroll);
  }, [calculateRange, containerRef]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => calculateRange());
    observer.observe(container);
    return () => observer.disconnect();
  }, [calculateRange, containerRef]);

  useEffect(() => {
    const id = requestAnimationFrame(() => calculateRange());
    return () => cancelAnimationFrame(id);
  }, [calculateRange]);

  return useMemo(() => range, [range]);
}
