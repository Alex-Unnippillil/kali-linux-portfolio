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

interface PulseOptions extends MicroInteractionOptions {
  iterations?: number | 'infinite';
  easing?: string;
}

export const usePulseInteraction = (options: PulseOptions = {}) => {
  const { amplitude = 0.25, duration, iterations = 1, easing = 'ease-in-out' } = options;
  const reduced = useReducedMotion();
  const durationMs = useDuration(duration, '--motion-medium', 420);
  const scaleMax = 1 + clamp(amplitude, 0, 1) * 0.4;

  const keyframes = useKeyframes(`
    0% { transform: scale(1); opacity: 1; }
    40% { transform: scale(${scaleMax}); opacity: 0.65; }
    100% { transform: scale(1); opacity: 1; }
  `);

  const [active, setActive] = useState(false);

  const trigger = useCallback(() => {
    if (reduced) return;
    setActive(false);
    window.requestAnimationFrame(() => setActive(true));
  }, [reduced]);

  const style = useMemo(() => {
    if (!active || reduced) return {};
    return {
      animation: `${keyframes} ${durationMs}ms ${easing} ${iterations}`,
      transformOrigin: 'center',
    };
  }, [active, durationMs, easing, iterations, keyframes, reduced]);

  const getPulseProps = useCallback(
    <T extends HTMLElement>(userProps?: HTMLAttributes<T>) =>
      withInteractionProps<T>(userProps, style, {
        onAnimationEnd: () => setActive(false),
      }),
    [style],
  );

  return {
    isActive: active,
    trigger,
    getPulseProps,
  };
};

export type PulseInteractionReturn = ReturnType<typeof usePulseInteraction>;
