import React, { useEffect, useRef } from 'react';
import { protocolName, getRowColor } from './utils';
import { resetFrameMetrics, trackFrame } from './frameMetrics';

// High-contrast background colours for the protocol bars. The darker
// shades ensure the 3:1 contrast ratio required for non-text elements on
// the black background of the waterfall.
const protocolColors = {
  TCP: 'bg-blue-600',
  UDP: 'bg-green-600',
  ICMP: 'bg-purple-600',
  default: 'bg-gray-600',
};

const Waterfall = ({ packets, colorRules, viewIndex, prefersReducedMotion }) => {
  const containerRef = useRef(null);

  useEffect(() => {
    resetFrameMetrics();
    return () => {
      resetFrameMetrics();
    };
  }, []);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    if (prefersReducedMotion) {
      node.style.transform = `translateX(-${viewIndex * 8}px)`;
      return;
    }
    const raf = trackFrame(() => {
      node.style.transform = `translateX(-${viewIndex * 8}px)`;
    });
    return () => {
      if (typeof cancelAnimationFrame === 'function') {
        cancelAnimationFrame(raf);
      }
    };
  }, [viewIndex, prefersReducedMotion]);

  return (
    <div className="relative h-16 bg-black overflow-hidden border-t border-gray-800" role="group" aria-label="Packet waterfall">
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
