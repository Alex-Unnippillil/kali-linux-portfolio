import type { Board } from './types';

function isValid(board: Board, row: number, col: number, val: number): boolean {
  for (let i = 0; i < 9; i += 1) {
    if (board[row][i] === val || board[i][col] === val) return false;
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      if (board[boxRow + r][boxCol + c] === val) return false;
    }
  }
  return true;
}

export function solve(board: Board): Board | null {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] === 0) {
        for (let val = 1; val <= 9; val += 1) {
          if (isValid(board, r, c, val)) {
            board[r][c] = val;
            const solved = solve(board);
            if (solved) return solved;
            board[r][c] = 0;
          }
        }
        return null;
      }
    }
  }
  return board.map((row) => [...row]);
}

export function countSolutions(board: Board, limit = 2): number {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] === 0) {
        let count = 0;
        for (let val = 1; val <= 9; val += 1) {
          if (isValid(board, r, c, val)) {
            board[r][c] = val;
            count += countSolutions(board, limit);
            board[r][c] = 0;
            if (count >= limit) return count;
          }
        }
        return count;
      }
    }
  }
  return 1;
}
