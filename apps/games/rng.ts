import seedrandom from 'seedrandom';

let rng: seedrandom.StatefulPRNG<seedrandom.State.Arc4> = seedrandom('', {
  state: true,
});

export const random = (): number => rng();

export const reset = (seed?: string): void => {
  rng = seedrandom(seed ?? '', { state: true });
};

export const serialize = (): string => {
  return JSON.stringify(rng.state());
};

export const deserialize = (state: string): void => {
  rng = seedrandom('', {
    state: JSON.parse(state) as seedrandom.State.Arc4,
  });
};

const rngApi = { random, reset, serialize, deserialize };
export default rngApi;
