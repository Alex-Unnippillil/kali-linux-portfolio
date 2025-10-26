'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, HTMLAttributes, SyntheticEvent } from 'react';
import usePrefersReducedMotion from '../../../hooks/usePrefersReducedMotion';

export interface MicroInteractionOptions {
  amplitude?: number;
  duration?: number;
}

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const parseDuration = (input: number | string | undefined, fallback: number) => {
  if (typeof input === 'number' && Number.isFinite(input)) return input;
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (!trimmed) return fallback;
    if (trimmed.endsWith('ms')) return Number.parseFloat(trimmed.replace('ms', ''));
    if (trimmed.endsWith('s')) return Number.parseFloat(trimmed.replace('s', '')) * 1000;
    const numeric = Number.parseFloat(trimmed);
    if (Number.isFinite(numeric)) return numeric;
  }
  return fallback;
};

export const useReducedMotion = () => usePrefersReducedMotion();

export const useDesignToken = (token: string, fallback: string) => {
  const [value, setValue] = useState<string>(fallback);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const root = document.documentElement;

    const read = () => {
      const style = getComputedStyle(root);
      const raw = style.getPropertyValue(token);
      if (raw) setValue(raw.trim());
    };

    read();

    const observer = new MutationObserver((mutations) => {
      if (mutations.some((m) => m.type === 'attributes')) read();
    });
    observer.observe(root, { attributes: true, attributeFilter: ['class', 'style'] });

    const handleTheme = () => read();
    window.addEventListener('storage', handleTheme);

    return () => {
      observer.disconnect();
      window.removeEventListener('storage', handleTheme);
    };
  }, [token]);

  return value;
};

export const useDuration = (duration: number | undefined, token: string, fallback: number) => {
  const tokenValue = useDesignToken(token, `${fallback}ms`);
  return useMemo(() => parseDuration(duration ?? tokenValue, fallback), [duration, fallback, tokenValue]);
};

export type EventHandler<T extends SyntheticEvent> = (event: T) => void;

export const composeEventHandlers = <T extends SyntheticEvent>(
  theirs: EventHandler<T> | undefined,
  ours: EventHandler<T>,
): EventHandler<T> => (event) => {
  theirs?.(event);
  if (!event.defaultPrevented) ours(event);
};

let keyframeCount = 0;

export const useKeyframes = (frames: string) => {
  const name = useMemo(() => {
    keyframeCount += 1;
    return `micro-${keyframeCount}`;
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-micro-interaction', name);
    styleEl.appendChild(document.createTextNode(`@keyframes ${name} {${frames}}`));
    document.head.appendChild(styleEl);
    return () => {
      document.head.removeChild(styleEl);
    };
  }, [frames, name]);

  return name;
};

export const mergeStyles = (
  base: CSSProperties | undefined,
  addition: CSSProperties,
): CSSProperties => ({ ...(base ?? {}), ...addition });

export const withInteractionProps = <T extends HTMLElement>(
  userProps: HTMLAttributes<T> | undefined,
  interactionStyle: CSSProperties,
  handlers: Partial<Record<keyof HTMLAttributes<T>, EventHandler<any>>>,
): HTMLAttributes<T> => {
  const props = userProps ?? {};
  const { style: userStyle, ...rest } = props;

  const composed: HTMLAttributes<T> = {
    ...rest,
    style: mergeStyles(userStyle, interactionStyle),
  };

  (Object.entries(handlers) as Array<[keyof HTMLAttributes<T>, EventHandler<any> | undefined]>).forEach(
    ([key, handler]) => {
      if (!handler) return;
      const existing = composed[key];
      composed[key] = existing
        ? (composeEventHandlers(existing as EventHandler<any>, handler) as HTMLAttributes<T>[keyof HTMLAttributes<T>])
        : (handler as HTMLAttributes<T>[keyof HTMLAttributes<T>]);
    },
  );

  return composed;
};

export const useTimeout = () => {
  const timeoutRef = useRef<number | null>(null);

  const clear = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  const start = useCallback((callback: () => void, delay: number) => {
    clear();
    timeoutRef.current = window.setTimeout(() => {
      timeoutRef.current = null;
      callback();
    }, delay);
  }, [clear]);

  useEffect(() => clear, [clear]);

  return { start, clear };
};

export const useRafLoop = (callback: () => boolean) => {
  const raf = useRef<number | null>(null);

  const loop = useCallback(() => {
    if (callback()) {
      raf.current = window.requestAnimationFrame(loop);
    } else if (raf.current) {
      window.cancelAnimationFrame(raf.current);
      raf.current = null;
    }
  }, [callback]);

  useEffect(() => () => {
    if (raf.current) window.cancelAnimationFrame(raf.current);
  }, []);

  return {
    start: () => {
      if (raf.current === null) {
        raf.current = window.requestAnimationFrame(loop);
      }
    },
    stop: () => {
      if (raf.current !== null) {
        window.cancelAnimationFrame(raf.current);
        raf.current = null;
      }
    },
  };
};
