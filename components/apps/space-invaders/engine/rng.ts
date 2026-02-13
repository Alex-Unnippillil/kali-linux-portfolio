export interface Rng {
  next(): number;
  setSeed(seed: number): void;
}

export const createRng = (seed = 1337): Rng => {
  let state = seed >>> 0;
  return {
    next() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    },
    setSeed(nextSeed: number) {
      state = nextSeed >>> 0;
    },
  };
};
