import { createInitialState, step, canMove } from '../apps/pacman/engine';
import type { EngineOptions } from '../apps/pacman/engine';
import type { LevelDefinition } from '../apps/pacman/types';

const baseLevel: LevelDefinition = {
  maze: [
    [1,1,1,1,1],
    [1,2,0,2,1],
    [1,0,0,0,1],
    [1,2,4,3,1],
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
  powerUpDuration: 4,
  shieldDuration: 5,
  speedBoostMultiplier: 1.4,
  deathPauseDuration: 0.8,
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
      baseLevel.maze.flat().filter((t) => t === 2 || t === 3 || t === 4).length - 1,
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

  it('supports power-up tiles and shield collisions', () => {
    const level: LevelDefinition = {
      maze: [
        [1,1,1,1,1],
        [1,4,0,2,1],
        [1,0,0,0,1],
        [1,1,1,1,1],
      ],
      pacStart: { x: 1, y: 1 },
      ghostStart: { x: 2, y: 2 },
      fruitTimes: [],
    };
    const state = createInitialState(level, { ...baseOptions, random: () => 0.1 });
    const powered = step(state, {}, 0.05, { ...baseOptions, random: () => 0.1 });
    expect(powered.events.powerUp).toBe('shield');
    expect(powered.state.shieldTimer).toBeGreaterThan(0);

    powered.state.ghosts[0].x = powered.state.pac.x;
    powered.state.ghosts[0].y = powered.state.pac.y;
    const shieldHit = step(powered.state, {}, 0, baseOptions);
    expect(shieldHit.events.shieldUsed).toBe(true);
    expect(shieldHit.state.pac.lives).toBe(3);
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

  it('enters dead state and respawns after the configured pause', () => {
    const state = createInitialState(baseLevel, baseOptions);
    state.ghosts[0].x = state.pac.x;
    state.ghosts[0].y = state.pac.y;

    const lifeLost = step(state, {}, 0.1, baseOptions);
    expect(lifeLost.state.status).toBe('dead');
    expect(lifeLost.state.deadTimer).toBeGreaterThan(0);

    const stillDead = step(lifeLost.state, {}, 0.2, baseOptions);
    expect(stillDead.state.status).toBe('dead');

    const respawn = step(stillDead.state, {}, 1.0, baseOptions);
    expect(respawn.events.respawned).toBe(true);
    expect(respawn.state.status).toBe('playing');
    expect(respawn.state.pac.x).toBeCloseTo(respawn.state.spawns.pac.x + 0.5, 2);
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
