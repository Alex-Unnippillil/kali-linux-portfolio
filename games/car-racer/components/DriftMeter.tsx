'use client';

import React, { useEffect, useState } from 'react';

export interface Vector2 {
  x: number;
  y: number;
}

export interface DriftMetrics {
  /** Current speed derived from velocity */
  speed: number;
  /** Angle in radians between velocity and facing direction */
  angle: number;
  /** Simple drift score derived from speed and angle */
  score: number;
}

/**
 * Calculate drift metrics based on current velocity and direction vectors.
 * The function returns speed (magnitude of velocity), the drift angle between
 * the velocity and facing direction and a simple drift score which is the
 * product of the two.  A larger angle at a higher speed yields a higher score.
 */
export const calculateDriftMetrics = (
  velocity: Vector2,
  direction: Vector2
): DriftMetrics => {
  const speed = Math.hypot(velocity.x, velocity.y);
  const dirMag = Math.hypot(direction.x, direction.y) || 1;
  // dot product for angle, clamped to valid acos domain
  const dot = (velocity.x * direction.x + velocity.y * direction.y) / (speed * dirMag);
  const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
  const score = speed * angle;
  return { speed, angle, score };
};

const STORAGE_KEY = 'car_racer_best_drift';

interface DriftMeterProps {
  /** Current velocity vector of the car */
  velocity: Vector2;
  /** Current facing direction of the car */
  direction: Vector2;
}

/**
 * Visual meter displaying current drift score and persisting the best score.
 */
const DriftMeter: React.FC<DriftMeterProps> = ({ velocity, direction }) => {
  const { score } = calculateDriftMetrics(velocity, direction);
  const [best, setBest] = useState(0);

  // load best drift score from storage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored) setBest(parseFloat(stored));
    } catch {
      // ignore storage errors
    }
  }, []);

  // update best score whenever the current score exceeds it
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (score > best) {
      setBest(score);
      try {
        window.localStorage.setItem(STORAGE_KEY, score.toString());
      } catch {
        /* ignore */
      }
    }
  }, [score, best]);

  const meter = best > 0 ? Math.min(1, score / best) : 0;

  return (
    <div className="w-40 text-white">
      <div className="w-full h-2 bg-gray-700">
        <div
          className="h-full bg-yellow-400 transition-all"
          style={{ width: `${meter * 100}%` }}
        />
      </div>
      <div className="text-xs mt-1">
        Drift: {score.toFixed(0)}
        {best > 0 && ` (best ${best.toFixed(0)})`}
      </div>
    </div>
  );
};

export default DriftMeter;

