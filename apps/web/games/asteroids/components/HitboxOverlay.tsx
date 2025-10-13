"use client";

import React, { useEffect, useState } from 'react';

export type Hitbox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

interface HitboxOverlayProps {
  hitboxes: Hitbox[];
}

const HitboxOverlay: React.FC<HitboxOverlayProps> = ({ hitboxes }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'c' || e.key === 'C') setVisible((v) => !v);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  return (
    <>
      <button
        type="button"
        className="absolute top-2 left-2 z-10 rounded bg-black/50 px-2 py-1 text-xs text-white"
        onClick={() => setVisible((v) => !v)}
      >
        {visible ? 'Hide' : 'Show'} Hitboxes (C)
      </button>
      {visible && (
        <svg className="pointer-events-none absolute inset-0">
          {hitboxes.map((hb, i) => (
            <rect
              key={i}
              x={hb.x}
              y={hb.y}
              width={hb.width}
              height={hb.height}
              fill="none"
              stroke="lime"
              strokeWidth={1}
            />
          ))}
        </svg>
      )}
    </>
  );
};

export default HitboxOverlay;

