'use client';

import { useCallback, useMemo, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent } from 'react';
import {
  MicroInteractionOptions,
  clamp,
  useDuration,
  useReducedMotion,
  withInteractionProps,
} from './utils';

interface PressOptions extends MicroInteractionOptions {
  restoreDelay?: number;
}

export const usePressInteraction = (options: PressOptions = {}) => {
  const { amplitude = 0.08, duration, restoreDelay = 80 } = options;
  const [pressed, setPressed] = useState(false);
  const reducedMotion = useReducedMotion();
  const durationMs = useDuration(duration, '--motion-fast', 150);

  const clamped = clamp(amplitude, 0, 0.6);

  const style = useMemo(() => {
    if (reducedMotion)
      return {
        transition: `transform 0ms`,
      };
    const scale = pressed ? 1 - clamped : 1;
    const shadowY = Math.round(clamped * 12);
    const shadowBlur = Math.round(clamped * 24);
    return {
      transform: `scale(${scale.toFixed(3)})`,
      transition: `transform ${durationMs}ms ease, box-shadow ${durationMs}ms ease`,
      boxShadow: pressed
        ? `0 ${shadowY}px ${shadowBlur}px rgba(0, 0, 0, 0.35)`
        : '0 2px 4px rgba(0, 0, 0, 0.2)',
    };
  }, [clamped, durationMs, pressed, reducedMotion]);

  const endPress = useCallback(() => {
    window.setTimeout(() => setPressed(false), restoreDelay);
  }, [restoreDelay]);

  const handlePointerDown = useCallback(() => {
    if (reducedMotion) return;
    setPressed(true);
  }, [reducedMotion]);

  const handlePointerUp = useCallback(() => {
    if (reducedMotion) return;
    endPress();
  }, [endPress, reducedMotion]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        if (!reducedMotion) setPressed(true);
      }
    },
    [reducedMotion],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        endPress();
      }
    },
    [endPress],
  );

  const getPressProps = useCallback(
    <T extends HTMLElement>(userProps?: HTMLAttributes<T>) =>
      withInteractionProps<T>(userProps, style, {
        onPointerDown: handlePointerDown,
        onPointerUp: handlePointerUp,
        onPointerLeave: handlePointerUp,
        onPointerCancel: handlePointerUp,
        onKeyDown: handleKeyDown,
        onKeyUp: handleKeyUp,
        onBlur: handlePointerUp,
      }),
    [handleKeyDown, handleKeyUp, handlePointerDown, handlePointerUp, style],
  );

  return {
    isPressed: pressed,
    getPressProps,
  };
};

export type PressInteractionReturn = ReturnType<typeof usePressInteraction>;
