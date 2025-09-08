import { random } from '../rng';

export let SIZE = 4;
export const setSize = (s: number) => {
  SIZE = s;
};
export type Board = number[][];

export const cloneBoard = (b: Board): Board => b.map((row) => [...row]);

export const addRandomTile = (board: Board, hard = false, count = 1) => {
  for (let i = 0; i < count; i++) {
    const empty: Array<[number, number]> = [];
    board.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell === 0) empty.push([r, c]);
      })
    );
    if (empty.length === 0) return board;
    const [r, c] = empty[Math.floor(random() * empty.length)];
    board[r][c] = hard ? 4 : random() < 0.9 ? 2 : 4;
  }
  return board;
};

export const slide = (row: number[]) => {
  const arr = row.filter((n) => n !== 0);
  let score = 0;
  const merges: number[] = [];
  const newRow: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === arr[i + 1]) {
      const val = arr[i] * 2;
      newRow.push(val);
      score += val;
      merges.push(newRow.length - 1);
      i++;
    } else {
      newRow.push(arr[i]);
    }
  }
  while (newRow.length < SIZE) newRow.push(0);
  return { row: newRow, score, merges };
};

export const slideRow = (
  row: number[],
): { row: number[]; merged: number[] } => {
  const { row: newRow, merges } = slide(row);
  return { row: newRow, merged: merges };
};

export const transpose = (board: Board) =>
  board[0].map((_, c) => board.map((row) => row[c]));

export type MoveResult = { board: Board; score: number; merges: Array<[number, number]> };

export const moveLeft = (board: Board): MoveResult => {
  let score = 0;
  const merges: Array<[number, number]> = [];
  const newBoard = board.map((row, r) => {
    const { row: newRow, score: s, merges: m } = slide(row);
    score += s;
    m.forEach((c) => merges.push([r, c]));
    return newRow;
  });
  return { board: newBoard, score, merges };
};

export const moveRight = (board: Board): MoveResult => {
  const reversed = board.map((row) => [...row].reverse());
  const { board: moved, score, merges } = moveLeft(reversed);
  return {
    board: moved.map((row) => row.reverse()),
    score,
    merges: merges.map(([r, c]) => [r, SIZE - 1 - c]),
  };
};

export const moveUp = (board: Board): MoveResult => {
  const transposed = transpose(board);
  const { board: moved, score, merges } = moveLeft(transposed);
  return {
    board: transpose(moved),
    score,
    merges: merges.map(([r, c]) => [c, r]),
  };
};

export const moveDown = (board: Board): MoveResult => {
  const transposed = transpose(board);
  const { board: moved, score, merges } = moveRight(transposed);
  return {
    board: transpose(moved),
    score,
    merges: merges.map(([r, c]) => [c, r]),
  };
};

export const boardsEqual = (a: Board, b: Board) =>
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));
