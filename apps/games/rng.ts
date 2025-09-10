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
  try {
    const parsed = JSON.parse(state);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'i' in parsed &&
      'j' in parsed &&
      'S' in parsed
    ) {
      rng = seedrandom('', {
        state: parsed as seedrandom.State.Arc4,
      });
      return;
    }
  } catch {
    // fall through to reset below
  }

  rng = seedrandom('', { state: true });
};

const rngApi = { random, reset, serialize, deserialize };
export default rngApi;
