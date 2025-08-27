import { defaultLevels } from '../apps/sokoban/levels';
import { loadLevel, move, undo, isSolved } from '../apps/sokoban/engine';

describe('sokoban engine', () => {
  test('impossible pushes are blocked', () => {
    const level = ['#####', '#@$##', '#####'];
    const state = loadLevel(level);
    const result = move(state, 'ArrowRight');
    expect(result).toBe(state);
  });

  test('detects when all goals are solved', () => {
    const state = loadLevel(defaultLevels[0]);
    expect(isSolved(state)).toBe(false);
    const solved = move(state, 'ArrowRight');
    expect(isSolved(solved)).toBe(true);
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
