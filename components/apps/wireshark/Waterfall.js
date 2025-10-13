import React, { useEffect, useRef } from 'react';
import { protocolName, getRowColor } from './utils';

// High-contrast background colours for the protocol bars. The darker
// shades ensure the 3:1 contrast ratio required for non-text elements on
// the black background of the waterfall.
const protocolColors = {
  TCP: 'bg-kali-primary',
  UDP: 'bg-emerald-500',
  ICMP: 'bg-purple-500',
  default: 'bg-slate-600',
};

const Waterfall = ({ packets, colorRules, viewIndex, prefersReducedMotion }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (prefersReducedMotion) {
      node.style.transform = `translateX(-${viewIndex * 8}px)`;
      return;
    }
    const raf = requestAnimationFrame(() => {
      node.style.transform = `translateX(-${viewIndex * 8}px)`;
    });
    return () => cancelAnimationFrame(raf);
  }, [viewIndex, prefersReducedMotion]);

  return (
    <div
      className="relative h-16 overflow-hidden border-t border-kali-border/40 bg-kali-surface/95"
      role="group"
      aria-label="Packet waterfall"
    >
      <div ref={containerRef} className="flex absolute top-0 left-0 h-full will-change-transform">
        {packets.map((p, idx) => {
          const ruleColor = getRowColor(p, colorRules);
          const protoColor = protocolColors[protocolName(p.protocol)] || protocolColors.default;
          const colorClass = ruleColor || protoColor;
          return (
            <div
              key={idx}
              className={`w-2 h-full ${colorClass} ${p.burstStart ? 'ml-1' : ''}`}
              title={`${protocolName(p.protocol)} packet at ${p.timestamp}`}
              aria-label={`${protocolName(p.protocol)} packet at ${p.timestamp}`}
            />
          );
        })}
      </div>
    </div>
  );
};

export default Waterfall;
