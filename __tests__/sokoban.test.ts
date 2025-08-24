import { defaultLevels } from '@apps/sokoban/levels';
import { loadLevel, move, undo, isSolved } from '@apps/sokoban/engine';
import { solve, SimpleState } from '@apps/sokoban/solverWorker';

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

  test('cannot push two boxes into a wall', () => {
    const level = ['#####', '#@$$#', '#####'];
    const state = loadLevel(level);
    const attempted = move(state, 'ArrowRight');
    expect(attempted).toBe(state);
  });

  test('solver suggests first move for simple level', () => {
    const state = loadLevel(defaultLevels[0]);
    const simple: SimpleState = {
      width: state.width,
      height: state.height,
      walls: state.walls,
      targets: state.targets,
      boxes: state.boxes,
      player: state.player,
    };
    const moves = solve(simple);
    expect(moves[0]).toBe('ArrowRight');
  });
});
