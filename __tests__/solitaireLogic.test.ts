import { initGame, draw, setDrawMode } from '../apps/games/solitaire/logic';
import { reset } from '../apps/games/rng';

describe('solitaire logic draw mode', () => {
  test('switching modes resets waste and changes draw count', () => {
    reset();
    const state = initGame('draw3');
    draw(state);
    expect(state.waste.length).toBe(3);
    setDrawMode(state, 'draw1');
    expect(state.drawMode).toBe('draw1');
    expect(state.waste.length).toBe(0);
    draw(state);
    expect(state.waste.length).toBe(1);
  });
});

