import seedrandom from 'seedrandom';
import { PieceGenerator } from './logic';
import type { RandomState, Tetromino } from './types';

interface RandomConfig {
  mode?: RandomState['mode'];
  seed?: string;
}

export const createRandomState = ({ mode = 'seven-bag', seed }: RandomConfig = {}): RandomState => {
  const rng = seedrandom(seed, { state: true });
  return {
    mode,
    bag: [],
    seed: seed ?? null,
    rngState: rng.state(),
  };
};

const nextRandom = (state: RandomState) => {
  const rng = seedrandom('', { state: state.rngState as seedrandom.State });
  const value = rng();
  return { value, rngState: rng.state() };
};

const withGenerator = (state: RandomState) => {
  const rng = seedrandom('', { state: state.rngState as seedrandom.State });
  const generator = new PieceGenerator(state.mode, rng);
  generator.setState({ mode: state.mode, bag: state.bag });
  return { rng, generator };
};

export const nextPiece = (state: RandomState): { piece: Tetromino; state: RandomState } => {
  if (state.mode === 'true-random') {
    const { rng, generator } = withGenerator(state);
    const piece = generator.next();
    return {
      piece,
      state: {
        ...state,
        bag: generator.getState().bag,
        rngState: rng.state(),
      },
    };
  }

  if (state.bag.length === 0) {
    const { rng, generator } = withGenerator(state);
    const piece = generator.next();
    return {
      piece,
      state: {
        ...state,
        bag: generator.getState().bag,
        rngState: rng.state(),
      },
    };
  }

  const bag = [...state.bag];
  const piece = bag.pop()!;
  return {
    piece,
    state: {
      ...state,
      bag,
    },
  };
};

export const shuffleBag = (state: RandomState): RandomState => {
  const bag: Tetromino[] = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
  let nextState = { ...state };
  for (let i = bag.length - 1; i > 0; i -= 1) {
    const { value, rngState } = nextRandom(nextState);
    const j = Math.floor(value * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
    nextState = { ...nextState, rngState };
  }
  return { ...nextState, bag };
};
