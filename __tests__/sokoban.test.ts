import { defaultLevels } from '../apps/sokoban/levels';
import {
  loadLevel,
  move,
  undo,
  redo,
  isSolved,
  findHint,
  findSolution,
  wouldDeadlock,
  findMinPushes,
} from '../apps/sokoban/engine';

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

  test('redo reapplies undone move', () => {
    const state = loadLevel(defaultLevels[0]);
    const moved = move(state, 'ArrowRight');
    const undone = undo(moved);
    const redone = redo(undone);
    expect(isSolved(redone)).toBe(true);
    expect(redone.moves).toBe(1);
  });

  test('move counter updates with undo and redo', () => {
    const state = loadLevel(defaultLevels[0]);
    const moved = move(state, 'ArrowRight');
    expect(moved.moves).toBe(1);
    const undone = undo(moved);
    expect(undone.moves).toBe(0);
    const redone = redo(undone);
    expect(redone.moves).toBe(1);
  });

  test('detects corner deadlock', () => {
    const level = ['#####', '#@$##', '# . #', '#####'];
    const state = loadLevel(level);
    expect(state.deadlocks.size).toBe(1);
  });

  test('solver hint gives first move', () => {
    const state = loadLevel(defaultLevels[0]);
    const hint = findHint(state);
    expect(hint).toBe('ArrowRight');
  });

  test('solver returns full solution path', () => {
    const state = loadLevel(defaultLevels[0]);
    const sol = findSolution(state);
    expect(sol).toEqual(['ArrowRight']);
  });

  test('minimal pushes computed', () => {
    const state = loadLevel(defaultLevels[0]);
    const min = findMinPushes(state);
    expect(min).toBe(1);
  });

  test('preflight corner deadlock', () => {
    const level = ['#####', '#@$ #', '#  ##', '#####'];
    const state = loadLevel(level);
    expect(wouldDeadlock(state, 'ArrowRight')).toBe(true);
  });

  test('preflight edge deadlock', () => {
    const level = ['#####', '#   #', '# $ #', '# @ #', '#####'];
    const state = loadLevel(level);
    expect(wouldDeadlock(state, 'ArrowUp')).toBe(true);
  });
});
