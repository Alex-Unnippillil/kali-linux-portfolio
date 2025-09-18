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

interface ShakeOptions extends MicroInteractionOptions {
  axis?: 'x' | 'y';
}

export const useShakeInteraction = (options: ShakeOptions = {}) => {
  const { amplitude = 0.4, duration, axis = 'x' } = options;
  const reduced = useReducedMotion();
  const durationMs = useDuration(duration, '--motion-medium', 360);
  const offset = useMemo(() => 4 + clamp(amplitude, 0, 1) * 12, [amplitude]);

  const frames = axis === 'x'
    ? `
      0% { transform: translateX(0); }
      20% { transform: translateX(${offset}px); }
      40% { transform: translateX(-${offset}px); }
      60% { transform: translateX(${offset}px); }
      80% { transform: translateX(-${Math.round(offset / 2)}px); }
      100% { transform: translateX(0); }
    `
    : `
      0% { transform: translateY(0); }
      20% { transform: translateY(${offset}px); }
      40% { transform: translateY(-${offset}px); }
      60% { transform: translateY(${offset}px); }
      80% { transform: translateY(-${Math.round(offset / 2)}px); }
      100% { transform: translateY(0); }
    `;

  const keyframes = useKeyframes(frames);
  const [active, setActive] = useState(false);

  const trigger = useCallback(() => {
    if (reduced) return;
    setActive(false);
    window.requestAnimationFrame(() => setActive(true));
  }, [reduced]);

  const style = useMemo(() => {
    if (!active || reduced) return {};
    return {
      animation: `${keyframes} ${durationMs}ms cubic-bezier(0.36, 0.07, 0.19, 0.97)`,
      willChange: 'transform',
    };
  }, [active, durationMs, keyframes, reduced]);

  const getShakeProps = useCallback(
    <T extends HTMLElement>(userProps?: HTMLAttributes<T>) =>
      withInteractionProps<T>(userProps, style, {
        onAnimationEnd: () => setActive(false),
      }),
    [style],
  );

  return {
    isActive: active,
    trigger,
    getShakeProps,
  };
};

export type ShakeInteractionReturn = ReturnType<typeof useShakeInteraction>;
