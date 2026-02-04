import { createInitialState, step, canMove } from '../apps/pacman/engine';
import type { EngineOptions } from '../apps/pacman/engine';
import type { LevelDefinition } from '../apps/pacman/types';

const baseLevel: LevelDefinition = {
  maze: [
    [1,1,1,1,1],
    [1,2,0,2,1],
    [1,0,0,0,1],
    [1,2,0,2,1],
    [1,1,1,1,1],
  ],
  fruit: { x: 2, y: 2 },
  fruitTimes: [1],
};

const baseOptions: EngineOptions = {
  speedMultiplier: 1,
  pacSpeed: 2,
  ghostSpeeds: { scatter: 1.5, chase: 2 },
  tunnelSpeed: 0.7,
  frightenedDuration: 6,
  scatterChaseSchedule: [
    { mode: 'scatter', duration: 1 },
    { mode: 'chase', duration: 2 },
  ],
  randomModeLevel: 2,
  levelIndex: 0,
  fruitDuration: 2,
  turnTolerance: 0.2,
  random: () => 0.3,
};

describe('pacman engine', () => {
  it('blocks movement through walls', () => {
    const level = {
      ...baseLevel,
      maze: [
        [1,1,1],
        [1,2,1],
        [1,1,1],
      ],
    };
    const state = createInitialState(level, baseOptions);
    state.pac.dir = { x: 1, y: 0 };
    expect(canMove(level.maze, 2, 1)).toBe(false);
    const result = step(state, {}, 0.5, baseOptions);
    expect(result.state.pac.x).toBeCloseTo(state.pac.x, 2);
    expect(result.state.pac.dir).toEqual({ x: 0, y: 0 });
  });

  it('collects pellets and updates score', () => {
    const state = createInitialState(baseLevel, baseOptions);
    const result = step(state, {}, 0.1, baseOptions);
    expect(result.state.score).toBe(10);
    expect(result.state.pelletsRemaining).toBe(
      baseLevel.maze.flat().filter((t) => t === 2 || t === 3).length - 1,
    );
  });

  it('energizer sets frightened mode timer', () => {
    const level = {
      ...baseLevel,
      maze: [
        [1,1,1],
        [1,3,1],
        [1,1,1],
      ],
    };
    const state = createInitialState(level, baseOptions);
    const result = step(state, {}, 0.1, baseOptions);
    expect(result.state.frightenedTimer).toBeCloseTo(
      baseOptions.frightenedDuration - 0.1,
      2,
    );
    expect(result.state.mode).toBe('fright');
  });

  it('handles ghost collisions in normal and frightened modes', () => {
    const state = createInitialState(baseLevel, baseOptions);
    state.pac.lives = 1;
    state.ghosts[0].x = state.pac.x;
    state.ghosts[0].y = state.pac.y;
    const result = step(state, {}, 0.1, baseOptions);
    expect(result.state.status).toBe('gameover');

    const frightened = createInitialState(baseLevel, baseOptions);
    frightened.frightenedTimer = 2;
    frightened.ghosts.forEach((ghost, index) => {
      if (index === 0) {
        ghost.x = frightened.pac.x;
        ghost.y = frightened.pac.y;
      } else {
        ghost.x = frightened.pac.x + 1;
        ghost.y = frightened.pac.y + 1;
      }
    });
    const resultFright = step(frightened, {}, 0.1, baseOptions);
    expect(resultFright.state.score).toBeGreaterThanOrEqual(200);
    expect(resultFright.state.ghosts[0].x).toBeCloseTo(
      frightened.spawns.ghosts.blinky.x + 0.5,
      2,
    );
  });

  it('transitions between scatter and chase on schedule', () => {
    const options: EngineOptions = {
      ...baseOptions,
      scatterChaseSchedule: [
        { mode: 'scatter', duration: 0.5 },
        { mode: 'chase', duration: 0.5 },
      ],
    };
    const state = createInitialState(baseLevel, options);
    const result = step(state, {}, 0.6, options);
    expect(result.state.mode).toBe('chase');
    const next = step(result.state, {}, 0.6, options);
    expect(next.state.mode).toBe('chase');
  });
});
