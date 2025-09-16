import { useCallback, useEffect, useMemo, useState } from 'react';

interface Options {
  /**
   * Minimum height applied to the virtual list container. This prevents the
   * viewport from collapsing while metrics are calculated.
   */
  minHeight?: number;
  /**
   * Pixels to subtract from the available viewport height. This leaves space
   * for padding or content rendered beneath the list.
   */
  viewportOffset?: number;
}

interface VirtualGridMetrics {
  containerRef: (node: HTMLDivElement | null) => void;
  height: number;
  columns: number;
  recalculate: () => void;
}

/**
 * Computes layout metrics for virtualised grid lists. The hook measures the
 * container element and derives a responsive column count that mirrors the
 * Tailwind breakpoints used throughout the desktop shell.
 */
export function useVirtualGrid(options?: Options): VirtualGridMetrics {
  const { minHeight = 320, viewportOffset = 24 } = options ?? {};
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [height, setHeight] = useState<number>(minHeight);
  const [columns, setColumns] = useState<number>(1);

  const computeColumns = useCallback((width: number) => {
    if (width >= 1024) return 3;
    if (width >= 640) return 2;
    return 1;
  }, []);

  const updateMetrics = useCallback(() => {
    if (typeof window === 'undefined' || !container) return;

    const width = container.clientWidth;
    const nextColumns = computeColumns(width);
    setColumns((prev) => (prev === nextColumns ? prev : nextColumns));

    const rect = container.getBoundingClientRect();
    const viewport = window.innerHeight || 0;
    const nextHeight = Math.max(minHeight, viewport - rect.top - viewportOffset);

    setHeight((prev) => (Math.abs(prev - nextHeight) < 1 ? prev : nextHeight));
  }, [computeColumns, container, minHeight, viewportOffset]);

  useEffect(() => {
    if (!container || typeof window === 'undefined') return;

    let frame = requestAnimationFrame(updateMetrics);

    const handleResize = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(updateMetrics);
    };

    window.addEventListener('resize', handleResize);

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(container);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
    };
  }, [container, updateMetrics]);

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    setContainer(node);
  }, []);

  const recalculate = useCallback(() => {
    updateMetrics();
  }, [updateMetrics]);

  return useMemo(
    () => ({
      containerRef,
      height,
      columns,
      recalculate,
    }),
    [columns, containerRef, height, recalculate]
  );
}

export default useVirtualGrid;
