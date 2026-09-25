export type Tetromino = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type RandomMode = 'seven-bag' | 'true-random';

const PIECES: Tetromino[] = ['I','J','L','O','S','T','Z'];

const shuffle = (arr: Tetromino[], rng: () => number): Tetromino[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export class PieceGenerator {
  private bag: Tetromino[] = [];
  private mode: RandomMode;
  private rng: () => number;

  constructor(mode: RandomMode = 'seven-bag', rng: () => number = Math.random) {
    this.mode = mode;
    this.rng = rng;
  }

  setMode(mode: RandomMode) {
    this.mode = mode;
    if (mode === 'seven-bag') {
      this.bag = [];
    }
  }

  setRng(rng: () => number) {
    this.rng = rng;
  }

  getState() {
    return {
      mode: this.mode,
      bag: [...this.bag],
    };
  }

  setState(state: { mode: RandomMode; bag: Tetromino[] }) {
    this.mode = state.mode;
    this.bag = [...state.bag];
  }

  next(): Tetromino {
    if (this.mode === 'seven-bag') {
      if (this.bag.length === 0) {
        this.bag = shuffle([...PIECES], this.rng);
      }
      return this.bag.pop()!;
    }
    return PIECES[Math.floor(this.rng() * PIECES.length)];
  }
}
