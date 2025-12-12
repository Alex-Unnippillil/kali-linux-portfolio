import seedrandom from 'seedrandom';

type SeedRandomState = ReturnType<typeof seedrandom> | seedrandom.prng;

let rng: SeedRandomState = seedrandom('', { state: true });

export const random = () => rng();

export const reset = (seed?: string) => {
  rng = seedrandom(seed ?? '', { state: true });
};

export const serialize = () => {
  return JSON.stringify((rng as any).state());
};

export const deserialize = (state: string) => {
  rng = seedrandom('', { state: JSON.parse(state) });
};

export const createRng = (state?: string, seed?: string) => {
  const instance: SeedRandomState = state
    ? seedrandom('', { state: JSON.parse(state) })
    : seedrandom(seed ?? '', { state: true });

  return {
    random: () => instance(),
    serialize: () => JSON.stringify((instance as any).state()),
  };
};

const rngApi = { random, reset, serialize, deserialize, createRng };
export default rngApi;
