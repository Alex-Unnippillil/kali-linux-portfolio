import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface Segment {
  name: string;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
}

const MAX_TRUNCATED_LENGTH = 24;

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate }) => {
  const navRef = useRef<HTMLElement | null>(null);
  const [isOverflowing, setIsOverflowing] = useState(false);

  const checkOverflow = useCallback(() => {
    const node = navRef.current;

    if (!node) {
      return;
    }

    const { clientWidth, scrollWidth } = node;
    const shouldTruncate = scrollWidth > clientWidth + 1;

    setIsOverflowing((prev) => (prev !== shouldTruncate ? shouldTruncate : prev));
  }, []);

  useEffect(() => {
    checkOverflow();
  }, [checkOverflow, path]);

  useEffect(() => {
    const node = navRef.current;

    if (!node || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(() => {
      checkOverflow();
    });

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [checkOverflow]);

  useEffect(() => {
    if (!isOverflowing || typeof window === 'undefined') {
      return undefined;
    }

    // Re-evaluate after the truncated labels have rendered to avoid stale overflow state.
    const timeout = window.setTimeout(() => {
      checkOverflow();
    }, 0);

    return () => {
      window.clearTimeout(timeout);
    };
  }, [checkOverflow, isOverflowing]);

  const visiblePath = useMemo(
    () =>
      path.map((seg, idx) => {
        const label = seg.name || '/';

        if (!isOverflowing || idx === 0 || idx === path.length - 1) {
          return label;
        }

        if (label.length <= MAX_TRUNCATED_LENGTH) {
          return label;
        }

        const ellipsis = '…';
        const keep = MAX_TRUNCATED_LENGTH - ellipsis.length;
        const start = Math.ceil(keep / 2);
        const end = Math.floor(keep / 2);

        return `${label.slice(0, start)}${ellipsis}${label.slice(label.length - end)}`;
      }),
    [isOverflowing, path],
  );

  return (
    <nav
      ref={navRef}
      className="flex items-center space-x-1 overflow-hidden text-white"
      aria-label="Breadcrumb"
    >
      {path.map((seg, idx) => {
        const displayLabel = visiblePath[idx];
        const originalLabel = seg.name || '/';

        return (
          <React.Fragment key={idx}>
            <button
              type="button"
              onClick={() => onNavigate(idx)}
              className="min-w-0 max-w-[12rem] truncate whitespace-nowrap text-left hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/70"
              title={originalLabel}
              aria-label={originalLabel}
            >
              {displayLabel}
            </button>
            {idx < path.length - 1 && (
              <span className="text-white/70" aria-hidden="true">
                /
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumbs;
