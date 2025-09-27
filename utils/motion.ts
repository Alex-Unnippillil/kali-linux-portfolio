import { isBrowser } from './isBrowser';

export type SpringVector = Record<string, number>;

export interface SpringConfig {
  stiffness?: number;
  damping?: number;
  mass?: number;
  restVelocity?: number;
  restDistance?: number;
  maxDuration?: number;
}

const DEFAULT_SPRING: Required<SpringConfig> = {
  stiffness: 260,
  damping: 32,
  mass: 1,
  restVelocity: 0.04,
  restDistance: 0.4,
  maxDuration: 800,
};

export const WINDOW_MINIMIZE_SPRING: Required<SpringConfig> = {
  stiffness: 420,
  damping: 36,
  mass: 1,
  restVelocity: 0.02,
  restDistance: 0.2,
  maxDuration: 650,
};

export interface SpringAnimationOptions<T extends SpringVector = SpringVector> {
  from: T;
  to: T;
  velocity?: Partial<T>;
  config?: SpringConfig;
  onUpdate: (value: T) => void;
  onComplete?: () => void;
}

export interface SpringAnimationHandle {
  cancel: () => void;
  isRunning: () => boolean;
}

type FrameHandle = number | ReturnType<typeof setTimeout>;

const scheduleFrame = (callback: (time: number) => void): FrameHandle => {
  if (isBrowser && typeof window.requestAnimationFrame === 'function') {
    return window.requestAnimationFrame(callback);
  }
  return setTimeout(() => callback(Date.now()), 16);
};

const cancelFrame = (handle: FrameHandle): void => {
  if (isBrowser && typeof window.cancelAnimationFrame === 'function' && typeof handle === 'number') {
    window.cancelAnimationFrame(handle);
  } else {
    clearTimeout(handle as ReturnType<typeof setTimeout>);
  }
};

const now = (): number => {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now();
  }
  return Date.now();
};

export const animateSpring = <T extends SpringVector>(
  options: SpringAnimationOptions<T>
): SpringAnimationHandle => {
  if (!isBrowser) {
    options.onUpdate(options.to);
    options.onComplete?.();
    return {
      cancel: () => {},
      isRunning: () => false,
    };
  }

  const config: Required<SpringConfig> = {
    ...DEFAULT_SPRING,
    ...options.config,
  };

  const toRecord = options.to as Record<string, number>;
  const fromRecord = options.from as Record<string, number>;
  const velocityRecord = options.velocity as Record<string, number> | undefined;

  const keys = Array.from(
    new Set([...Object.keys(toRecord), ...Object.keys(fromRecord ?? {})])
  );

  const current: Record<string, number> = {};
  const velocity: Record<string, number> = {};
  keys.forEach((key) => {
    const fromValue = fromRecord?.[key];
    const initialVelocity = velocityRecord?.[key];
    current[key] = typeof fromValue === 'number' ? fromValue : 0;
    velocity[key] = typeof initialVelocity === 'number' ? initialVelocity : 0;
  });

  let running = true;
  let frame: FrameHandle | null = null;
  let lastTime = now();
  const endTime = lastTime + config.maxDuration;

  const step = (time: number) => {
    if (!running) return;
    const clampedTime = Math.min(time, endTime);
    const dt = Math.min((clampedTime - lastTime) / 1000, 0.064);
    lastTime = clampedTime;

    let settled = true;
    keys.forEach((key) => {
      const target = toRecord[key];
      const value = current[key];
      const vel = velocity[key];

      const springForce = -config.stiffness * (value - target);
      const dampingForce = -config.damping * vel;
      const acceleration = (springForce + dampingForce) / config.mass;
      const nextVelocity = vel + acceleration * dt;
      const nextValue = value + nextVelocity * dt;

      velocity[key] = nextVelocity;
      current[key] = nextValue;

      if (
        Math.abs(nextVelocity) > config.restVelocity ||
        Math.abs(nextValue - target) > config.restDistance
      ) {
        settled = false;
      } else {
        current[key] = target;
        velocity[key] = 0;
      }
    });

    options.onUpdate({ ...(current as T) });

    if (!settled && clampedTime < endTime) {
      frame = scheduleFrame(step);
      return;
    }

    running = false;
    options.onUpdate(options.to);
    options.onComplete?.();
  };

  frame = scheduleFrame(step);

  return {
    cancel: () => {
      if (!running) return;
      running = false;
      if (frame !== null) {
        cancelFrame(frame);
        frame = null;
      }
    },
    isRunning: () => running,
  };
};

export const prefersReducedMotion = (): boolean => {
  if (!isBrowser || typeof window.matchMedia !== 'function') {
    return false;
  }
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (error) {
    return false;
  }
};
