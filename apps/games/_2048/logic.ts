import { random } from '../rng';

export const SIZE = 4;
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
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] === arr[i + 1]) {
      arr[i] *= 2;
      arr[i + 1] = 0;
    }
  }
  const newRow = arr.filter((n) => n !== 0);
  while (newRow.length < SIZE) newRow.push(0);
  return newRow;
};

export const transpose = (board: Board) =>
  board[0].map((_, c) => board.map((row) => row[c]));

export const moveLeft = (board: Board): Board => board.map((row) => slide(row));
export const moveRight = (board: Board): Board => moveLeft(board.map((row) => [...row].reverse())).map((row) => row.reverse());
export const moveUp = (board: Board): Board => transpose(moveLeft(transpose(board)));
export const moveDown = (board: Board): Board => transpose(moveRight(transpose(board)));

export const boardsEqual = (a: Board, b: Board) =>
  a.every((row, r) => row.every((cell, c) => cell === b[r][c]));
