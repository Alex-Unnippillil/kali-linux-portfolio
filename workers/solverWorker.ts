import { generateSudoku, solveBoard } from '../components/apps/sudoku-utils';

self.onmessage = (e: MessageEvent) => {
  const { type, difficulty, seed, board } = e.data as any;
  if (type === 'generate') {
    const { puzzle, solution } = generateSudoku(difficulty, seed);
    (self as any).postMessage({ puzzle, solution });
  } else if (type === 'solve' && board) {
    const copy = board.map((r: number[]) => r.slice());
    solveBoard(copy);
    (self as any).postMessage({ solution: copy });
  }
};
