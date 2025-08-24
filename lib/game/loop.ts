export interface LoopOptions {
  update: (dt: number) => void;
  render?: (interp: number) => void;
  fps?: number;
}

/**
 * Shared game loop utility using `requestAnimationFrame` with a fixed timestep.
 * The loop automatically pauses when the tab is hidden or when the user
 * prefers reduced motion. Returns a cleanup function that stops the loop and
 * removes listeners.
 */
export function startGameLoop({
  update,
  render,
  fps = 60,
}: LoopOptions): () => void {
  if (typeof window === 'undefined') return () => {};

  const step = 1000 / fps;
  let last = performance.now();
  let acc = 0;
  let raf = 0;
  let running = true;

  const media = window.matchMedia('(prefers-reduced-motion: reduce)');

  const frame = (now: number) => {
    if (!running || media.matches) return;

    acc += now - last;
    last = now;

    while (acc >= step) {
      update(step / 1000);
      acc -= step;
    }

    render?.(acc / step);
    raf = requestAnimationFrame(frame);
  };

  const pause = () => {
    running = false;
    cancelAnimationFrame(raf);
  };

  const resume = () => {
    if (running || media.matches || document.hidden) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  };

  const onVisibility = () => {
    if (document.hidden) pause();
    else resume();
  };

  const onMotionChange = () => {
    if (media.matches) pause();
    else resume();
  };

  document.addEventListener('visibilitychange', onVisibility);
  media.addEventListener('change', onMotionChange);

  if (!media.matches && !document.hidden) {
    raf = requestAnimationFrame(frame);
  } else {
    running = false;
  }

  return () => {
    pause();
    document.removeEventListener('visibilitychange', onVisibility);
    media.removeEventListener('change', onMotionChange);
  };
}
