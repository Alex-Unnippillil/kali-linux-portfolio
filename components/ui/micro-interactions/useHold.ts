'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type { HTMLAttributes, KeyboardEvent } from 'react';
import {
  MicroInteractionOptions,
  clamp,
  useDuration,
  useReducedMotion,
  useRafLoop,
  useTimeout,
  withInteractionProps,
} from './utils';

interface HoldOptions extends MicroInteractionOptions {
  delay?: number;
}

export const useHoldInteraction = (options: HoldOptions = {}) => {
  const { amplitude = 0.2, duration, delay } = options;
  const reducedMotion = useReducedMotion();
  const durationMs = useDuration(duration, '--motion-medium', 320);
  const holdDelay = delay ?? durationMs;

  const [isPressed, setIsPressed] = useState(false);
  const [isHeld, setIsHeld] = useState(false);
  const [progress, setProgress] = useState(0);

  const startTime = useRef<number | null>(null);
  const { start: startTimeout, clear: clearTimeout } = useTimeout();

  const rafLoop = useRafLoop(() => {
    if (startTime.current === null) return false;
    const elapsed = performance.now() - startTime.current;
    const ratio = Math.min(elapsed / holdDelay, 1);
    setProgress(ratio);
    return ratio < 1 && !reducedMotion;
  });

  const reset = useCallback(() => {
    startTime.current = null;
    setIsPressed(false);
    setIsHeld(false);
    setProgress(0);
    clearTimeout();
    rafLoop.stop();
  }, [clearTimeout, rafLoop]);

  const commitHold = useCallback(() => {
    if (reducedMotion) return;
    setIsHeld(true);
  }, [reducedMotion]);

  const begin = useCallback(() => {
    if (isPressed || reducedMotion) return;
    startTime.current = performance.now();
    setIsPressed(true);
    setProgress(0);
    rafLoop.start();
    startTimeout(commitHold, holdDelay);
  }, [commitHold, holdDelay, isPressed, rafLoop, reducedMotion, startTimeout]);

  const style = useMemo(() => {
    if (reducedMotion)
      return {
        transition: 'transform 0ms',
      };
    const clamped = clamp(amplitude, 0, 1);
    const eased = Math.pow(progress, 1.5);
    const scale = isHeld ? 1 + clamped * 0.6 : 1 + eased * clamped * 0.5;
    return {
      transform: `scale(${scale.toFixed(3)})`,
      transition: isHeld ? `transform ${durationMs / 1.5}ms ease-out` : undefined,
      boxShadow: isHeld
        ? `0 ${Math.round(clamped * 10)}px ${Math.round(clamped * 30)}px rgba(0,0,0,0.35)`
        : `0 3px 8px rgba(0,0,0,${0.15 + eased * 0.2})`,
    };
  }, [amplitude, durationMs, isHeld, progress, reducedMotion]);

  const handlePointerDown = useCallback(() => {
    begin();
  }, [begin]);

  const handleEnd = useCallback(() => {
    reset();
  }, [reset]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        begin();
      }
    },
    [begin],
  );

  const handleKeyUp = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        reset();
      }
    },
    [reset],
  );

  const getHoldProps = useCallback(
    <T extends HTMLElement>(userProps?: HTMLAttributes<T>) =>
      withInteractionProps<T>(userProps, style, {
        onPointerDown: handlePointerDown,
        onPointerUp: handleEnd,
        onPointerLeave: handleEnd,
        onPointerCancel: handleEnd,
        onKeyDown: handleKeyDown,
        onKeyUp: handleKeyUp,
        onBlur: handleEnd,
      }),
    [handleEnd, handleKeyDown, handleKeyUp, handlePointerDown, style],
  );

  return {
    isHeld,
    isPressing: isPressed,
    progress,
    getHoldProps,
  };
};

export type HoldInteractionReturn = ReturnType<typeof useHoldInteraction>;
