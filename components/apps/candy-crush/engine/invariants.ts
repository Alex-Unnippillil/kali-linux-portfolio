import type { Board } from './types';
import { detectMatches } from './match';

export const validateBoardInvariants = (board: Board) => {
  const errors: string[] = [];
  for (let r = 0; r < board.rows; r += 1) {
    for (let c = 0; c < board.cols; c += 1) {
      const cell = board.cells[r]?.[c];
      if (!cell) errors.push(`Missing cell ${r},${c}`);
      if (cell?.hole && cell.candy) errors.push(`Hole contains candy at ${r},${c}`);
      if (cell && cell.ice > 0 && cell.candy) errors.push(`Ice cell contains candy at ${r},${c}`);
    }
  }
  return errors;
};

export const boardIsStable = (board: Board) => detectMatches(board).length === 0;
