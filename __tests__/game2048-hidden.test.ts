import { Board, SIZE, addRandomTile, revealHidden } from '../games/2048/logic';
import { reset } from '../apps/games/rng';

describe('2048 hidden tile mode', () => {
  it('tracks hidden tiles when adding a tile', () => {
    const board: Board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    reset('test');
    const hidden = new Set<string>();
    addRandomTile(board, hidden, false, 1, true);
    expect(hidden.size).toBe(1);
    revealHidden(hidden);
    expect(hidden.size).toBe(0);
  });
});
