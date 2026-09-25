import React, { useEffect, useMemo, useRef, useState } from 'react';

const EDGE_BASE =
  'pointer-events-none absolute inset-y-0 z-10 w-5 transition-opacity duration-200';

const HorizontalScrollAffordance = ({
  children,
  className = '',
  regionLabel,
  hint = 'Scroll horizontally for more',
  showHint = true,
}) => {
  const scrollRef = useRef(null);
  const [canScroll, setCanScroll] = useState(false);
  const [showLeft, setShowLeft] = useState(false);
  const [showRight, setShowRight] = useState(false);

  const evaluateScroll = () => {
    const node = scrollRef.current;
    if (!node) return;
    const hasOverflow = node.scrollWidth > node.clientWidth + 1;
    const atStart = node.scrollLeft <= 1;
    const atEnd = node.scrollLeft + node.clientWidth >= node.scrollWidth - 1;
    setCanScroll(hasOverflow);
    setShowLeft(hasOverflow && !atStart);
    setShowRight(hasOverflow && !atEnd);
  };

  useEffect(() => {
    evaluateScroll();
    if (typeof window === 'undefined') return undefined;
    window.addEventListener('resize', evaluateScroll);
    return () => window.removeEventListener('resize', evaluateScroll);
  }, []);

  const ariaLabel = useMemo(() => {
    if (!regionLabel) return undefined;
    return canScroll ? `${regionLabel}. ${hint}.` : regionLabel;
  }, [canScroll, hint, regionLabel]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={evaluateScroll}
        className={className}
        aria-label={ariaLabel}
      >
        {children}
      </div>

      <div
        aria-hidden="true"
        className={`${EDGE_BASE} left-0 bg-gradient-to-r from-[color:color-mix(in_srgb,var(--kali-panel)_95%,#060b14)] to-transparent ${
          showLeft ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        aria-hidden="true"
        className={`${EDGE_BASE} right-0 bg-gradient-to-l from-[color:color-mix(in_srgb,var(--kali-panel)_95%,#060b14)] to-transparent ${
          showRight ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {showHint && canScroll && !showLeft && showRight && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 right-2 rounded-full border border-[color:color-mix(in_srgb,var(--kali-panel-border)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--kali-panel)_90%,rgba(15,148,210,0.18))] px-2 py-0.5 text-[10px] uppercase tracking-wide text-[color:color-mix(in_srgb,var(--kali-terminal-text)_70%,rgba(148,210,255,0.4))]"
        >
          Scroll →
        </div>
      )}
    </div>
  );
};

export default HorizontalScrollAffordance;
