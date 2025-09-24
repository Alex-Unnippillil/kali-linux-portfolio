export type Tetromino = 'I' | 'J' | 'L' | 'O' | 'S' | 'T' | 'Z';
export type RandomMode = 'seven-bag' | 'true-random';

const PIECES: Tetromino[] = ['I','J','L','O','S','T','Z'];

const shuffle = (arr: Tetromino[]): Tetromino[] => {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

export class PieceGenerator {
  private bag: Tetromino[] = [];
  private mode: RandomMode;

  constructor(mode: RandomMode = 'seven-bag') {
    this.mode = mode;
  }

  setMode(mode: RandomMode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'seven-bag') {
      this.bag = [];
    }
  }

  next(): Tetromino {
    if (this.mode === 'seven-bag') {
      if (this.bag.length === 0) {
        this.bag = shuffle([...PIECES]);
      }
      return this.bag.pop()!;
    }
    return PIECES[Math.floor(Math.random() * PIECES.length)];
  }

  serialize() {
    return {
      mode: this.mode,
      bag: [...this.bag],
    };
  }

  load(state: { mode: RandomMode; bag?: Tetromino[] }) {
    this.mode = state.mode;
    this.bag = state.bag ? [...state.bag] : [];
  }
}
