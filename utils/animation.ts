import { isBrowser } from './isBrowser';

export interface LoopTick {
  /** Fixed delta time in milliseconds for the current update step. */
  deltaTime: number;
  /** Sequential frame counter incremented on each update step. */
  frame: number;
  /** High resolution timestamp (ms) from the current animation frame. */
  timestamp: number;
  /** Time elapsed (ms) between the last RAF callback and this one. */
  frameTime: number;
}

export interface RenderTick {
  /** Interpolation factor based on the remaining accumulator (0-1). */
  alpha: number;
  /** Sequential frame counter matching the last update. */
  frame: number;
  /** High resolution timestamp (ms) from requestAnimationFrame. */
  timestamp: number;
}

export interface GameLoopControls {
  start: () => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  isRunning: () => boolean;
  isPaused: () => boolean;
}

export interface GameLoopOptions {
  /** Update callback executed using a fixed timestep. */
  update: (tick: LoopTick) => void;
  /** Optional render callback invoked once per animation frame. */
  render?: (tick: RenderTick) => void;
  /** Fixed timestep in milliseconds. Defaults to 16.667ms (60Hz). */
  timestep?: number;
  /**
   * Maximum number of update steps processed per RAF frame before clamping.
   * Prevents the "spiral of death" on very slow frames.
   */
  maxUpdates?: number;
  /** Optional error handler invoked when update/render throws. */
  onError?: (error: unknown) => void;
  /** Automatically start the loop upon creation. Defaults to true. */
  autoStart?: boolean;
}

const DEFAULT_TIMESTEP = 1000 / 60;
const DEFAULT_MAX_UPDATES = 240;
const MAX_FRAME_DELTA = 1000; // clamp to one second between frames

export function createGameLoop(options: GameLoopOptions): GameLoopControls {
  const {
    update,
    render,
    onError,
    timestep = DEFAULT_TIMESTEP,
    maxUpdates = DEFAULT_MAX_UPDATES,
    autoStart = true,
  } = options;

  if (!isBrowser) {
    return {
      start: () => undefined,
      stop: () => undefined,
      pause: () => undefined,
      resume: () => undefined,
      isRunning: () => false,
      isPaused: () => false,
    };
  }

  let running = false;
  let paused = false;
  let frame = 0;
  let accumulator = 0;
  let lastFrameTime = 0;
  let raf: number | null = null;
  const step = Math.max(1, timestep);

  const loop = (timestamp: number) => {
    if (!running) {
      return;
    }

    if (paused) {
      raf = requestAnimationFrame(loop);
      return;
    }

    if (!lastFrameTime) {
      lastFrameTime = timestamp;
    }

    let frameDelta = timestamp - lastFrameTime;
    if (!Number.isFinite(frameDelta)) {
      frameDelta = step;
    }
    frameDelta = Math.min(frameDelta, MAX_FRAME_DELTA);
    lastFrameTime = timestamp;
    accumulator += frameDelta;

    let updates = 0;
    while (accumulator >= step && updates < maxUpdates) {
      frame += 1;
      try {
        update({
          deltaTime: step,
          frame,
          timestamp,
          frameTime: frameDelta,
        });
      } catch (error) {
        onError?.(error);
      }
      accumulator -= step;
      updates += 1;
    }

    if (updates >= maxUpdates) {
      accumulator = 0;
    }

    if (render) {
      try {
        render({
          alpha: accumulator / step,
          frame,
          timestamp,
        });
      } catch (error) {
        onError?.(error);
      }
    }

    raf = requestAnimationFrame(loop);
  };

  const start = () => {
    if (running) {
      return;
    }
    running = true;
    paused = false;
    frame = 0;
    accumulator = 0;
    lastFrameTime = 0;
    raf = requestAnimationFrame(loop);
  };

  const stop = () => {
    running = false;
    paused = false;
    if (raf !== null) {
      cancelAnimationFrame(raf);
      raf = null;
    }
  };

  const pause = () => {
    if (!running) {
      return;
    }
    paused = true;
  };

  const resume = () => {
    if (!running) {
      start();
      return;
    }
    if (!paused) {
      return;
    }
    paused = false;
    lastFrameTime = 0;
  };

  if (autoStart) {
    start();
  }

  return {
    start,
    stop,
    pause,
    resume,
    isRunning: () => running,
    isPaused: () => paused,
  };
}

export default createGameLoop;
