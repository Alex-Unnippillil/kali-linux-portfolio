"use client";

import React, { useEffect, useRef, useState } from 'react';

interface ShieldProps {
  /** milliseconds for the shield to fully regenerate once destroyed */
  regenDuration?: number;
  /** maximum hit points of the shield */
  maxHp?: number;
}

/**
 * A simple shield component used by the Space Invaders clone.
 *
 * The shield tracks its own hit points. When HP reaches zero the component
 * starts a regeneration timer. During regeneration a progress bar is rendered
 * below the shield so the player can see when it will be available again.
 */
const Shield: React.FC<ShieldProps> = ({ regenDuration = 3000, maxHp = 6 }) => {
  const [hp, setHp] = useState(maxHp);
  const [progress, setProgress] = useState(0); // 0..1
  const animRef = useRef<number | null>(null);

  // Start a regeneration timer when the shield is destroyed
  useEffect(() => {
    if (hp > 0) return; // still alive
    const start = performance.now();

    const step = (ts: number) => {
      const pct = Math.min((ts - start) / regenDuration, 1);
      setProgress(pct);
      if (pct < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        setHp(maxHp);
        setProgress(0);
      }
    };

    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [hp, regenDuration, maxHp]);

  // Example damage handler – in a real game the parent would manage this
  const takeDamage = () => {
    setHp((h) => Math.max(h - 1, 0));
  };

  const widthPercent = (hp / maxHp) * 100;

  return (
    <div className="relative inline-block" onClick={takeDamage} aria-label="shield">
      <div
        className="h-4 w-12 bg-green-600"
        style={{ opacity: hp === 0 ? 0.3 : 1 }}
      >
        <div
          className="h-full bg-green-400"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
      {hp === 0 && (
        <div className="absolute left-0 top-full mt-1 h-1 w-full bg-gray-700">
          <div
            className="h-full bg-cyan-400"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
      )}
    </div>
  );
};

export default Shield;

