export type LoopStop = () => void;

export const gameLoop = (
  step: (dt: number) => void,
  timestep = 1000 / 60,
): LoopStop => {
  let last = 0;
  let acc = 0;
  let frame = 0;
  const loop = (time: number) => {
    if (!last) last = time;
    acc += time - last;
    while (acc >= timestep) {
      step(timestep);
      acc -= timestep;
    }
    last = time;
    frame = requestAnimationFrame(loop);
  };
  frame = requestAnimationFrame(loop);
  return () => cancelAnimationFrame(frame);
};
