/* eslint-disable no-restricted-globals */
import { getHint, candidates } from './hints';
import type { Board, Hint } from './types';

function clone(board: Board): Board {
  return board.map((row) => [...row]);
}

function findBestCell(board: Board): {
  r: number;
  c: number;
  cand: number[];
} | null {
  let best: { r: number; c: number; cand: number[] } | null = null;
  let min = 10;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c] === 0) {
        const cand = candidates(board, r, c);
        if (cand.length === 0) return null;
        if (cand.length < min) {
          min = cand.length;
          best = { r, c, cand };
        }
      }
    }
  }
  return best;
}

function propagate(board: Board): Board | null {
  let progress = true;
  while (progress) {
    progress = false;
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (board[r][c] === 0) {
          const cand = candidates(board, r, c);
          if (cand.length === 0) return null;
          if (cand.length === 1) {
            board[r][c] = cand[0];
            progress = true;
          }
        }
      }
    }
  }
  return board;
}

function solve(board: Board): Board | null {
  const propagated = propagate(board);
  if (!propagated) return null;
  const cell = findBestCell(propagated);
  if (!cell) return propagated; // solved
  for (const n of cell.cand) {
    const attempt = clone(propagated);
    attempt[cell.r][cell.c] = n;
    const result = solve(attempt);
    if (result) return result;
  }
  return null;
}

self.onmessage = (
  e: MessageEvent<{ type: 'solve' | 'hint'; board: Board }>
) => {
  if (e.data.type === 'hint') {
    const hint = getHint(e.data.board);
    // @ts-ignore
    postMessage({ type: 'hint', hint });
    return;
  }
  const result = solve(clone(e.data.board));
  // @ts-ignore
  postMessage({ type: 'solve', solution: result });
};
