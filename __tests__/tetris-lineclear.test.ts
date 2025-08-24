import { createGame, createPiece, lock, COLS, ROWS } from '../apps/tetris/engine';

describe('tetris line clears', () => {
  test('single line clear removes row and counts score', () => {
    const state = createGame();
    // Fill bottom row except last four cells
    state.board[ROWS - 1] = Array(COLS).fill(1);
    for (let x = 6; x < COLS; x++) state.board[ROWS - 1][x] = 0;
    state.current = createPiece('I');
    state.current.x = 6;
    state.current.y = ROWS - 2; // piece's filled row is y+1
    const res = lock(state);
    expect(res.lines).toBe(1);
    expect(state.linesCleared).toBe(1);
    expect(state.board[ROWS - 1].every((c) => c === 0)).toBe(true);
  });
});
