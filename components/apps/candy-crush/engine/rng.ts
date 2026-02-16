export interface SeededRng {
  seed: number;
  next: () => number;
  nextInt: (max: number) => number;
  state: () => number;
}

const MOD = 0x100000000;

export const createRng = (seed = 123456789): SeededRng => {
  let s = seed >>> 0;
  const next = () => {
    s = (1664525 * s + 1013904223) % MOD;
    return s / MOD;
  };
  return {
    seed,
    next,
    nextInt: (max: number) => Math.floor(next() * Math.max(max, 1)),
    state: () => s >>> 0,
  };
};
