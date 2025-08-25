import { defaultLevels } from '../apps/sokoban/levels';
import { loadLevel, move, undo, isSolved } from '../apps/sokoban/engine';

describe('sokoban engine', () => {
  test('simple level solvable', () => {
    const state = loadLevel(defaultLevels[0]);
    const moved = move(state, 'ArrowRight');
    expect(isSolved(moved)).toBe(true);
  });

  test('undo restores previous state', () => {
    const state = loadLevel(defaultLevels[0]);
    const moved = move(state, 'ArrowRight');
    const undone = undo(moved);
    expect(undone.player).toEqual(state.player);
    expect(Array.from(undone.boxes)).toEqual(Array.from(state.boxes));
    expect(undone.pushes).toBe(state.pushes);
  });
});
