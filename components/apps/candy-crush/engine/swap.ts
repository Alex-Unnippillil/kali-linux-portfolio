import type { Board, Coord } from './types';
import { cloneBoard } from './board';
import { validateSwap } from './match';

export const applySwap = (board: Board, a: Coord, b: Coord): Board => {
  const copy = cloneBoard(board);
  const temp = copy.cells[a.r][a.c].candy;
  copy.cells[a.r][a.c].candy = copy.cells[b.r][b.c].candy;
  copy.cells[b.r][b.c].candy = temp;
  return copy;
};

export const canSwap = (board: Board, a: Coord, b: Coord) => validateSwap(board, a, b);
