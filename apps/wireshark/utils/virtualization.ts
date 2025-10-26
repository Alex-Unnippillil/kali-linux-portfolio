import { useCallback, useEffect, useRef, useState } from 'react';

export interface VirtualRange {
  start: number;
  end: number;
  offset: number;
  totalHeight: number;
  visibleCount: number;
}

export interface UseVirtualRowsOptions {
  itemCount: number;
  rowHeight: number;
  overscan?: number;
}

const ensurePositive = (value: number, fallback: number) =>
  Number.isFinite(value) && value > 0 ? value : fallback;

const defaultHeightFor = (rowHeight: number, overscan: number, count: number) => {
  const safeRow = ensurePositive(rowHeight, 1);
  const base = safeRow * Math.max(1, Math.min(count, overscan * 2 + 1));
  return base;
};

export const calculateVirtualRange = (
  scrollTop: number,
  viewportHeight: number,
  rowHeight: number,
  itemCount: number,
  overscan = 4
): VirtualRange => {
  const safeRowHeight = ensurePositive(rowHeight, 1);
  const safeHeight = ensurePositive(
    viewportHeight,
    defaultHeightFor(safeRowHeight, overscan, itemCount)
  );
  const safeCount = Math.max(0, itemCount);
  if (safeCount === 0) {
    return { start: 0, end: 0, offset: 0, totalHeight: 0, visibleCount: 0 };
  }

  const rawStart = Math.floor(Math.max(0, scrollTop) / safeRowHeight);
  const visible = Math.max(1, Math.ceil(safeHeight / safeRowHeight));
  const overscanAmount = Math.max(0, Math.floor(overscan));
  const start = Math.max(0, Math.min(rawStart - overscanAmount, safeCount - visible));
  const end = Math.min(
    safeCount,
    rawStart + visible + overscanAmount
  );
  const offset = start * safeRowHeight;
  const totalHeight = safeCount * safeRowHeight;
  return { start, end, offset, totalHeight, visibleCount: end - start };
};

export interface VirtualRowsResult {
  containerRef: React.RefObject<HTMLDivElement>;
  range: VirtualRange;
}

const measureHeight = (
  element: HTMLDivElement,
  rowHeight: number,
  overscan: number,
  itemCount: number
) => {
  const measured = element.clientHeight || element.getBoundingClientRect().height;
  return ensurePositive(
    measured,
    defaultHeightFor(rowHeight, overscan, itemCount)
  );
};

export const useVirtualRows = ({
  itemCount,
  rowHeight,
  overscan = 4,
}: UseVirtualRowsOptions): VirtualRowsResult => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState<VirtualRange>(() =>
    calculateVirtualRange(0, rowHeight, rowHeight, itemCount, overscan)
  );

  const updateRange = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const height = measureHeight(container, rowHeight, overscan, itemCount);
    const next = calculateVirtualRange(
      container.scrollTop,
      height,
      rowHeight,
      itemCount,
      overscan
    );
    setRange((prev) =>
      prev.start === next.start &&
      prev.end === next.end &&
      prev.offset === next.offset &&
      prev.totalHeight === next.totalHeight &&
      prev.visibleCount === next.visibleCount
        ? prev
        : next
    );
  }, [itemCount, overscan, rowHeight]);

  useEffect(() => {
    updateRange();
  }, [updateRange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    const onScroll = () => updateRange();
    const onResize = () => updateRange();

    container.addEventListener('scroll', onScroll, { passive: true });

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onResize);
      resizeObserver.observe(container);
    } else {
      window.addEventListener('resize', onResize);
    }

    return () => {
      container.removeEventListener('scroll', onScroll);
      if (resizeObserver) {
        resizeObserver.disconnect();
      } else {
        window.removeEventListener('resize', onResize);
      }
    };
  }, [updateRange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const height = measureHeight(container, rowHeight, overscan, itemCount);
    const totalHeight = Math.max(0, itemCount * Math.max(1, rowHeight));
    const maxScroll = Math.max(0, totalHeight - height);
    if (container.scrollTop > maxScroll) {
      container.scrollTop = maxScroll;
    }
    setRange(() =>
      calculateVirtualRange(container.scrollTop, height, rowHeight, itemCount, overscan)
    );
  }, [itemCount, overscan, rowHeight]);

  return { containerRef, range };
};

