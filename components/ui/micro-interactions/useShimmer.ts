'use client';

import { useMemo } from 'react';
import type { HTMLAttributes } from 'react';
import {
  MicroInteractionOptions,
  clamp,
  useDuration,
  useKeyframes,
  useReducedMotion,
  withInteractionProps,
} from './utils';

interface ShimmerOptions extends MicroInteractionOptions {
  angle?: number;
  baseColor?: string;
  highlightColor?: string;
}

export const useShimmerInteraction = (options: ShimmerOptions = {}) => {
  const { amplitude = 0.35, duration, angle = 90, baseColor, highlightColor } = options;
  const reduced = useReducedMotion();
  const durationMs = useDuration(duration, '--motion-slow', 1400);
  const shimmerKeyframes = useKeyframes(`
    0% { background-position: -150% 0; }
    100% { background-position: 150% 0; }
  `);

  const style = useMemo(() => {
    const alpha = clamp(amplitude, 0, 1);
    const highlight = highlightColor ?? `rgba(255, 255, 255, ${alpha.toFixed(2)})`;
    const bg = baseColor ?? 'rgba(255,255,255,0.1)';
    const gradient = `linear-gradient(${angle}deg, transparent 0%, ${highlight} 45%, ${highlight} 55%, transparent 100%)`;
    if (reduced) {
      return {
        backgroundImage: gradient,
        backgroundColor: bg,
      };
    }
    return {
      position: 'relative' as const,
      backgroundImage: gradient,
      backgroundColor: bg,
      backgroundSize: '200% 100%',
      animation: `${shimmerKeyframes} ${durationMs}ms linear infinite`,
    };
  }, [angle, amplitude, baseColor, durationMs, highlightColor, reduced, shimmerKeyframes]);

  const getShimmerProps = <T extends HTMLElement>(userProps?: HTMLAttributes<T>) =>
    withInteractionProps<T>(userProps, style, {});

  return {
    isAnimating: !reduced,
    getShimmerProps,
  };
};

export type ShimmerInteractionReturn = ReturnType<typeof useShimmerInteraction>;
