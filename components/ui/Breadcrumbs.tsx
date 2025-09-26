import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Segment {
  name: string;
  [key: string]: unknown;
}

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
  homeLabel?: string;
  overflowLabel?: string;
}

const MAX_VISIBLE_SEGMENTS = 4;

const Breadcrumbs: React.FC<Props> = ({
  path,
  onNavigate,
  homeLabel = 'Home',
  overflowLabel = 'Show hidden folders',
}) => {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const overflowContainerRef = useRef<HTMLDivElement | null>(null);
  const overflowButtonRef = useRef<HTMLButtonElement | null>(null);

  const showOverflow = path.length > MAX_VISIBLE_SEGMENTS;

  const { overflowSegments, tailSegments } = useMemo(() => {
    if (!showOverflow) {
      return {
        overflowSegments: [] as Segment[],
        tailSegments: path.slice(1),
      };
    }
    return {
      overflowSegments: path.slice(1, -2),
      tailSegments: path.slice(-2),
    };
  }, [path, showOverflow]);

  useEffect(() => {
    if (!overflowOpen) return;
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      const container = overflowContainerRef.current;
      if (container && !container.contains(event.target as Node)) {
        setOverflowOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOverflowOpen(false);
        overflowButtonRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [overflowOpen]);

  useEffect(() => {
    setOverflowOpen(false);
  }, [path]);

  const renderSeparator = (key: string) => (
    <span key={key} aria-hidden="true">
      /
    </span>
  );

  const crumbs: React.ReactNode[] = [];

  const addCrumb = (label: string, index: number) => {
    const isCurrent = index === path.length - 1;
    const key = `crumb-${index}`;
    if (crumbs.length) {
      crumbs.push(renderSeparator(`sep-${key}`));
    }
    crumbs.push(
      <button
        key={key}
        type="button"
        onClick={() => onNavigate(index)}
        className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
        aria-current={isCurrent ? 'page' : undefined}
      >
        <span className="flex items-center gap-1">
          {index === 0 && (
            <span aria-hidden="true">
              🏠
            </span>
          )}
          <span>{label || '/'}</span>
        </span>
      </button>
    );
  };

  const addOverflow = () => {
    if (!overflowSegments.length) return;
    if (crumbs.length) {
      crumbs.push(renderSeparator('sep-overflow'));
    }
    crumbs.push(
      <div key="overflow" className="relative" ref={overflowContainerRef}>
        <button
          type="button"
          ref={overflowButtonRef}
          onClick={() => setOverflowOpen((open) => !open)}
          aria-haspopup="menu"
          aria-expanded={overflowOpen}
          aria-label={overflowLabel}
          className="px-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded hover:underline"
        >
          …
        </button>
        {overflowOpen && (
          <div
            role="menu"
            className="absolute left-0 mt-1 bg-ub-warm-grey border border-white/20 rounded shadow-lg z-10 min-w-[8rem] py-1"
          >
            {overflowSegments.map((segment, offset) => {
              const actualIndex = offset + 1;
              const isCurrent = actualIndex === path.length - 1;
              return (
                <button
                  key={`overflow-${actualIndex}`}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOverflowOpen(false);
                    onNavigate(actualIndex);
                  }}
                  className="w-full text-left px-3 py-1 hover:bg-white/10 focus:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                  aria-current={isCurrent ? 'page' : undefined}
                >
                  {segment.name || '/'}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  if (path.length) {
    const homeName = path[0]?.name || homeLabel;
    const homeDisplay = homeLabel || homeName;
    addCrumb(homeDisplay, 0);
  } else {
    addCrumb(homeLabel, 0);
  }

  if (showOverflow) {
    addOverflow();
    tailSegments.forEach((segment, idx) => {
      const actualIndex = path.length - tailSegments.length + idx;
      addCrumb(segment.name, actualIndex);
    });
  } else {
    tailSegments.forEach((segment, idx) => {
      addCrumb(segment.name, idx + 1);
    });
  }

  return (
    <nav className="flex items-center space-x-1 text-white" aria-label="Breadcrumb">
      {crumbs}
    </nav>
  );
};

export default Breadcrumbs;
