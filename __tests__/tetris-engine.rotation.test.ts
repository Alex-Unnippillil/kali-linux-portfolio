import { createInitialState, dispatch, setCell } from '../games/tetris/engine';

describe('tetris engine rotation', () => {
  it('applies SRS kicks for I piece near a stack', () => {
    const initial = createInitialState();
    const board = new Uint8Array(initial.board);
    setCell(board, initial.width, 2, 0, 1);
    const state = {
      ...initial,
      board,
      active: { type: 'I', rotation: 0, x: 0, y: 0 },
    };
    const rotated = dispatch(state, { type: 'rotate', dir: 'cw' });

    expect(rotated.active.rotation).toBe(1);
    expect(rotated.active.x).toBe(-2);
  });

  it('kicks JLSTZ pieces away from blocking stacks', () => {
    const initial = createInitialState();
    const board = new Uint8Array(initial.board);
    setCell(board, initial.width, 6, 0, 1);
    const state = {
      ...initial,
      board,
      active: { type: 'J', rotation: 0, x: 4, y: 0 },
    };
    const rotated = dispatch(state, { type: 'rotate', dir: 'cw' });

    expect(rotated.active.rotation).toBe(1);
    expect(rotated.active.x).toBe(3);
  });
});
