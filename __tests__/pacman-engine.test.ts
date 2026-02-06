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

  it('scales ghost scores during frightened combos', () => {
    const state = createInitialState(baseLevel, baseOptions);
    state.frightenedTimer = 2;
    state.ghosts[0].x = state.pac.x;
    state.ghosts[0].y = state.pac.y;
    const first = step(state, {}, 0.1, baseOptions);
    expect(first.state.score).toBeGreaterThanOrEqual(200);

    const comboState = {
      ...first.state,
      pac: { ...first.state.pac, x: first.state.ghosts[1].x, y: first.state.ghosts[1].y },
    };
    const second = step(comboState, {}, 0.1, baseOptions);
    expect(second.state.score).toBeGreaterThan(first.state.score);
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

  it('snaps pacman to the tile center when blocked to avoid wall lock', () => {
    const level: LevelDefinition = {
      maze: [
        [1,1,1],
        [1,2,1],
        [1,2,1],
        [1,1,1],
      ],
      fruit: { x: 1, y: 2 },
      fruitTimes: [],
      pacStart: { x: 1, y: 1 },
    };
    const state = createInitialState(level, baseOptions);
    state.pac.dir = { x: 1, y: 0 };

    const blocked = step(state, {}, 0.4, baseOptions);
    expect(blocked.state.pac.dir).toEqual({ x: 0, y: 0 });
    expect(blocked.state.pac.x).toBeCloseTo(1.5, 2);
    expect(blocked.state.pac.y).toBeCloseTo(1.5, 2);

    const turned = step(blocked.state, { direction: { x: 0, y: 1 } }, 0.4, baseOptions);
    expect(turned.state.pac.dir).toEqual({ x: 0, y: 1 });
    expect(turned.state.pac.y).toBeGreaterThan(1.5);
  });

  it('reverses ghosts when the mode changes', () => {
    const options: EngineOptions = {
      ...baseOptions,
      scatterChaseSchedule: [
        { mode: 'scatter', duration: 0.01 },
        { mode: 'chase', duration: 1 },
      ],
    };
    const state = createInitialState(baseLevel, options);
    state.ghosts[0].dir = { x: 1, y: 0 };
    const result = step(state, {}, 0.02, options);
    expect(result.state.mode).toBe('chase');
    expect(result.state.ghosts[0].dir).not.toEqual({ x: 1, y: 0 });
  });
});
