export interface LoopOptions {
  update: (dt: number) => void;
  render?: (interp: number) => void;
  fps?: number;
}

export function startFixedLoop({ update, render, fps = 60 }: LoopOptions): () => void {
  const timestep = 1000 / fps;
  let last = performance.now();
  let acc = 0;
  let raf: number;

  function frame(now: number) {
    acc += now - last;
    last = now;

    while (acc >= timestep) {
      update(timestep / 1000);
      acc -= timestep;
    }

    render?.(acc / timestep);
    raf = requestAnimationFrame(frame);
  }

  raf = requestAnimationFrame(frame);
  return () => cancelAnimationFrame(raf);
}
