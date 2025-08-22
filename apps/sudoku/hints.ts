import type { Board, Hint } from './types';

function candidates(board: Board, row: number, col: number): number[] {
  if (board[row][col] !== 0) return [];
  const nums = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  for (let i = 0; i < 9; i += 1) {
    nums.delete(board[row][i]);
    nums.delete(board[i][col]);
  }
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  for (let r = 0; r < 3; r += 1) {
    for (let c = 0; c < 3; c += 1) {
      nums.delete(board[boxRow + r][boxCol + c]);
    }
  }
  return Array.from(nums);
}

function singleCandidate(board: Board): Hint | null {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cand = candidates(board, r, c);
      if (cand.length === 1) {
        return { row: r, col: c, value: cand[0], type: 'single' };
      }
    }
  }
  return null;
}

function pointingPairs(board: Board): Hint | null {
  for (let br = 0; br < 3; br += 1) {
    for (let bc = 0; bc < 3; bc += 1) {
      const startR = br * 3;
      const startC = bc * 3;
      for (let n = 1; n <= 9; n += 1) {
        const cells: { r: number; c: number }[] = [];
        for (let r = 0; r < 3; r += 1) {
          for (let c = 0; c < 3; c += 1) {
            const rr = startR + r;
            const cc = startC + c;
            if (board[rr][cc] === 0 && candidates(board, rr, cc).includes(n)) {
              cells.push({ r: rr, c: cc });
            }
          }
        }
        if (cells.length === 2) {
          const sameRow = cells[0].r === cells[1].r;
          const sameCol = cells[0].c === cells[1].c;
          if (sameRow || sameCol) {
            return { row: cells[0].r, col: cells[0].c, value: n, type: 'pointing' };
          }
        }
      }
    }
  }
  return null;
}

export function getHint(board: Board): Hint | null {
  return singleCandidate(board) || pointingPairs(board);
}

export { candidates };
