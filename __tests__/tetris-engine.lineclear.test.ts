import { createInitialState, dispatch, setCell } from '../games/tetris/engine';

describe('tetris engine line clear', () => {
  it('clears a single line and detects perfect clear', () => {
    const initial = createInitialState();
    const board = new Uint8Array(initial.board);
    const bottom = initial.totalHeight - 1;
    for (let x = 4; x < initial.width; x += 1) {
      setCell(board, initial.width, x, bottom, 2);
    }
    const state = {
      ...initial,
      board,
      active: { type: 'I', rotation: 0, x: 0, y: initial.totalHeight - 2 },
    };

    const locked = dispatch(state, { type: 'hardDrop' });

    expect(locked.lines).toBe(1);
    expect(locked.lastClear?.perfectClear).toBe(true);
    expect(locked.board.every((cell) => cell === 0)).toBe(true);
  });
});
