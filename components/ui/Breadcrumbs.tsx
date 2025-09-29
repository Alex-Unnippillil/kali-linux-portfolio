import React, { useEffect, useMemo, useRef, useState } from 'react';

interface Segment {
  name: string;
}

type ResponsiveRule =
  | {
      type: 'dropdown';
      maxWidth: number;
      triggerLabel?: string;
      srLabel?: string;
    }
  | {
      type: 'label';
      maxWidth: number;
      label: string;
      srLabel?: string;
    };

interface Props {
  path: Segment[];
  onNavigate: (index: number) => void;
  responsive?: ResponsiveRule[];
}

const Breadcrumbs: React.FC<Props> = ({ path, onNavigate, responsive = [] }) => {
  const [viewportWidth, setViewportWidth] = useState<number | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const activeRule = useMemo(() => {
    if (!responsive.length || viewportWidth === null) return null;
    const sorted = [...responsive].sort((a, b) => a.maxWidth - b.maxWidth);
    return sorted.find((rule) => viewportWidth <= rule.maxWidth) ?? null;
  }, [responsive, viewportWidth]);

  useEffect(() => {
    if (activeRule?.type !== 'dropdown') {
      setDropdownOpen(false);
    }
  }, [activeRule]);

  useEffect(() => {
    if (!dropdownOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setDropdownOpen(false);
      }
    };
    const onFocusIn = (event: FocusEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('focusin', onFocusIn);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('focusin', onFocusIn);
    };
  }, [dropdownOpen]);

  const handleNavigate = (index: number) => {
    setDropdownOpen(false);
    onNavigate(index);
  };

  if (!path.length) {
    return null;
  }

  const first = path[0];
  const last = path[path.length - 1];
  const middle = path.slice(1, -1);

  const renderButton = (seg: Segment, idx: number) => (
    <button
      key={idx}
      type="button"
      onClick={() => handleNavigate(idx)}
      className="hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60 rounded"
    >
      {seg.name || '/'}
    </button>
  );

  return (
    <nav className="flex items-center gap-1 text-white" aria-label="Breadcrumb">
      {renderButton(first, 0)}
      {path.length > 1 && <span aria-hidden="true">/</span>}
      {path.length > 2 && activeRule?.type === 'dropdown' && (
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setDropdownOpen((open) => !open)}
            className="px-1 py-0.5 rounded hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
            aria-haspopup="menu"
            aria-expanded={dropdownOpen}
          >
            <span aria-hidden="true">{activeRule.triggerLabel ?? '…'}</span>
            <span className="sr-only">{activeRule.srLabel ?? 'Show collapsed breadcrumb levels'}</span>
          </button>
          {dropdownOpen && (
            <div className="absolute left-0 z-10 mt-1 min-w-[10rem] rounded border border-white/20 bg-ub-cool-grey text-left shadow-lg">
              <ul role="menu" className="py-1">
                {middle.map((seg, idx) => {
                  const absoluteIndex = idx + 1;
                  return (
                    <li key={absoluteIndex}>
                      <button
                        type="button"
                        role="menuitem"
                        onClick={() => handleNavigate(absoluteIndex)}
                        className="w-full px-3 py-1 text-left hover:bg-white/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      >
                        {seg.name || '/'}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
      {path.length > 2 && activeRule?.type === 'dropdown' && (
        <span aria-hidden="true">/</span>
      )}
      {path.length > 2 && activeRule?.type === 'label' && (
        <span className="px-1 py-0.5 text-xs text-white/70 rounded bg-white/10">
          <span aria-hidden="true">{activeRule.label}</span>
          <span className="sr-only">{activeRule.srLabel ?? 'Collapsed breadcrumb levels'}</span>
        </span>
      )}
      {path.length > 2 && activeRule?.type === 'label' && <span aria-hidden="true">/</span>}
      {path.length > 2 && !activeRule &&
        middle.map((seg, idx) => (
          <React.Fragment key={idx}>
            {renderButton(seg, idx + 1)}
            <span aria-hidden="true">/</span>
          </React.Fragment>
        ))}
      {path.length > 1 && renderButton(last, path.length - 1)}
    </nav>
  );
};

export default Breadcrumbs;
