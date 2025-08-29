import { random } from '../../apps/games/rng';
import {
  Board,
  SIZE,
  moveLeft,
  moveRight,
  moveUp,
  moveDown,
  boardsEqual,
} from '../../apps/games/_2048/logic';

export type HiddenTiles = Set<string>;
export { Board, SIZE, moveLeft, moveRight, moveUp, moveDown, boardsEqual };

export const addRandomTile = (
  board: Board,
  hidden?: HiddenTiles,
  hard = false,
  count = 1,
  hide = false,
) => {
  for (let i = 0; i < count; i++) {
    const empty: Array<[number, number]> = [];
    board.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (cell === 0) empty.push([r, c]);
      }),
    );
    if (empty.length === 0) return board;
    const [r, c] = empty[Math.floor(random() * empty.length)];
    board[r][c] = hard ? 4 : random() < 0.9 ? 2 : 4;
    if (hide && hidden) hidden.add(`${r}-${c}`);
  }
  return board;
};

export const revealHidden = (hidden: HiddenTiles) => {
  hidden.clear();
};
