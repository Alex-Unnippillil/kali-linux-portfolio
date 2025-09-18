'use client';

import { useCallback, useMemo, useState } from 'react';
import type { HTMLAttributes } from 'react';
import {
  MicroInteractionOptions,
  clamp,
  useDuration,
  useKeyframes,
  useReducedMotion,
  withInteractionProps,
} from './utils';

interface SnapOptions extends MicroInteractionOptions {
  direction?: 'up' | 'down';
  damping?: number;
}

export const useSnapInteraction = (options: SnapOptions = {}) => {
  const { amplitude = 0.35, duration, direction = 'down', damping = 0.6 } = options;
  const reduced = useReducedMotion();
  const durationMs = useDuration(duration, '--motion-fast', 220);
  const offset = clamp(amplitude, 0, 1) * 12;
  const overshoot = offset * damping;

  const translateAxis = direction === 'down' ? 1 : -1;

  const keyframes = useKeyframes(`
    0% { transform: translateY(${translateAxis * -offset}px) scale(${1 + amplitude * 0.2}); }
    60% { transform: translateY(${translateAxis * overshoot}px) scale(${1 - amplitude * 0.1}); }
    100% { transform: translateY(0) scale(1); }
  `);

  const [active, setActive] = useState(false);

  const trigger = useCallback(() => {
    if (reduced) return;
    setActive(false);
    window.requestAnimationFrame(() => setActive(true));
  }, [reduced]);

  const style = useMemo(() => {
    if (!active || reduced) return {};
    const animationValue = `${keyframes} ${durationMs}ms cubic-bezier(0.2, 0.8, 0.3, 1)`;
    return {
      animation: animationValue,
      transformOrigin: 'center',
      willChange: 'transform',
    };
  }, [active, durationMs, keyframes, reduced]);

  const getSnapProps = useCallback(
    <T extends HTMLElement>(userProps?: HTMLAttributes<T>) =>
      withInteractionProps<T>(userProps, style, {
        onAnimationEnd: () => setActive(false),
      }),
    [style],
  );

  return {
    isActive: active,
    trigger,
    getSnapProps,
  };
};

export type SnapInteractionReturn = ReturnType<typeof useSnapInteraction>;
