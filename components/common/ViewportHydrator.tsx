'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import clsx from 'clsx';
import { reportIslandHydrated } from '../../lib/perf/islandMetrics';

interface ViewportHydratorProps {
  children: () => ReactNode;
  fallback?: ReactNode;
  rootMargin?: string;
  className?: string;
  metricName?: string;
  style?: CSSProperties;
}

const supportsIntersectionObserver = () =>
  typeof window !== 'undefined' && 'IntersectionObserver' in window;

export default function ViewportHydrator({
  children,
  fallback = null,
  rootMargin = '200px 0px',
  className,
  metricName,
  style,
}: ViewportHydratorProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [shouldRender, setShouldRender] = useState(!supportsIntersectionObserver());
  const hasReportedRef = useRef(false);
  const startTimeRef = useRef<number | null>(
    typeof performance !== 'undefined' ? performance.now() : null,
  );

  useEffect(() => {
    if (shouldRender) return;
    const node = containerRef.current;
    if (!node || !supportsIntersectionObserver()) {
      setShouldRender(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setShouldRender(true);
          }
        });
      },
      { rootMargin },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [rootMargin, shouldRender]);

  useEffect(() => {
    if (!shouldRender || hasReportedRef.current) return;
    hasReportedRef.current = true;
    if (!metricName) return;
    const start = startTimeRef.current ?? 0;
    const end = typeof performance !== 'undefined' ? performance.now() : start;
    reportIslandHydrated({
      name: metricName,
      start,
      end,
    });
  }, [metricName, shouldRender]);

  return (
    <div
      ref={containerRef}
      className={clsx('relative w-full', className)}
      style={style}
      aria-busy={!shouldRender}
      data-island={metricName}
    >
      {shouldRender ? children() : fallback}
    </div>
  );
}
