'use client';

import { useEffect, useState } from 'react';

const GridOverlay = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT' ||
        target.isContentEditable;
      if (isInput) return;
      if (e.altKey && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        setVisible((v) => !v);
      }
      if (e.key === 'Escape') {
        setVisible(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!visible || process.env.NODE_ENV === 'production') return null;

  const widths = [640, 768, 1024, 1280, 1536];

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[9999]"
      style={{
        backgroundImage:
          'linear-gradient(rgba(0,0,0,0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.2) 1px, transparent 1px)',
        backgroundSize: '8px 8px',
      }}
    >
      {widths.map((w) => (
        <div
          key={w}
          className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2"
          style={{ width: w }}
        >
          <div className="absolute inset-0 border-l border-r border-blue-500/50">
            <span className="absolute -top-4 left-0 text-blue-500 text-xs">{w}px</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default GridOverlay;
