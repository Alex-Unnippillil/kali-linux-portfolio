import { canMove, createInitialState, findScatterCorners, step, targetTileForGhost } from '../apps/pacman/engine';
import type { EngineOptions } from '../apps/pacman/engine';
import type { LevelDefinition } from '../apps/pacman/types';

const baseLevel: LevelDefinition = {
  name: 'Base',
  maze: [
    [1,1,1,1,1],
    [0,2,0,2,0],
    [0,0,3,0,0],
    [0,2,0,2,0],
    [1,1,1,1,1],
  ],
  pacStart: { x: 1, y: 1 },
  ghostStart: { x: 4, y: 1 },
  fruit: { x: 4, y: 1 },
  fruitTimes: [100],
};

const options: EngineOptions = {
  speedMultiplier: 1,
  pacSpeed: 3,
  ghostSpeeds: { scatter: 2, chase: 2.2 },
  tunnelSpeed: 0.7,
  frightenedDuration: 3,
  scatterChaseSchedule: [
    { mode: 'scatter', duration: 1 },
    { mode: 'chase', duration: 2 },
  ],
  randomModeLevel: 0,
  levelIndex: 1,
  fruitDuration: 2,
  turnTolerance: 0.22,
  readyDuration: 0,
  deathDuration: 0.2,
  random: () => 0,
};

const ready = (state: ReturnType<typeof createInitialState>) => step(state, {}, 0.1, options).state;

describe('pacman engine', () => {
  it('blocks movement through walls', () => {
    const level: LevelDefinition = {
      maze: [
        [1,1,1],
        [1,2,1],
        [1,1,1],
      ],
      pacStart: { x: 1, y: 1 },
      ghostStart: { x: 1, y: 1 },
    };
    const state = ready(createInitialState(level, options));
    state.pac.dir = { x: 1, y: 0 };
    expect(canMove(level.maze, 2, 1)).toBe(false);
    expect(step(state, {}, 0.2, options).state.pac.dir).toEqual({ x: 0, y: 0 });
  });

  it('pellet consumption updates score and pellet count', () => {
    const state = ready(createInitialState(baseLevel, options));
    const result = step(state, {}, 0.1, options);
    expect(result.state.score).toBe(10);
    expect(result.state.pelletsRemaining).toBe(baseLevel.maze.flat().filter((tile) => tile === 2 || tile === 3).length - 1);
    expect(result.events.pellet).toBe(true);
  });

  it('energizer triggers frightened state and resets combo', () => {
    const level: LevelDefinition = {
      maze: [
        [0,0,0],
        [0,3,0],
        [0,0,0],
      ],
      pacStart: { x: 1, y: 1 },
      ghostStart: { x: 0, y: 0 },
    };
    const state = ready(createInitialState(level, options));
    state.frightenedCombo = 2;
    const result = step(state, {}, 0.01, options);
    expect(result.state.mode).toBe('fright');
    expect(result.state.frightenedCombo).toBe(0);
    expect(result.events.energizer).toBe(true);
  });

  it('ghost eaten scoring sequence increments properly', () => {
    const state = ready(createInitialState(baseLevel, options));
    state.frightenedTimer = 2;
    state.mode = 'fright';
    state.ghosts.forEach((ghost, index) => {
      ghost.x = 3.5 + index;
      ghost.y = 1.5;
      ghost.state = 'frightened';
    });

    const increments: number[] = [];
    for (let i = 0; i < 4; i += 1) {
      const ghost = state.ghosts[i];
      state.pac.x = ghost.x;
      state.pac.y = ghost.y;
      const before = state.score;
      step(state, {}, 0.01, options);
      increments.push(state.score - before);
    }

    expect(increments).toEqual([210, 400, 800, 1600]);
  });

  it('life loss decrements lives and reaches game over at zero', () => {
    const state = ready(createInitialState(baseLevel, options));
    state.pac.lives = 1;
    state.ghosts[0].x = state.pac.x;
    state.ghosts[0].y = state.pac.y;
    const first = step(state, {}, 0.01, options);
    expect(first.events.lifeLost).toBe(true);

    const second = step(first.state, {}, 0.2, options);
    const third = step(second.state, {}, 0.2, options);
    expect(third.state.status).toBe('gameover');
  });

  it('tunnel wrap works at left and right edges', () => {
    const level: LevelDefinition = {
      maze: [
        [1,1,1,1,1],
        [0,2,0,0,0],
        [1,1,1,1,1],
      ],
      pacStart: { x: 0, y: 1 },
      ghostStart: { x: 2, y: 1 },
    };
    const state = ready(createInitialState(level, options));
    state.pac.dir = { x: -1, y: 0 };
    step(state, {}, 0.2, options);
    step(state, {}, 0.2, options);
    step(state, {}, 0.2, options);
    expect(state.pac.x).toBeGreaterThan(3);

    state.pac.dir = { x: 1, y: 0 };
    state.pac.x = 4.6;
    step(state, {}, 0.2, options);
    expect(state.pac.x).toBeLessThan(1);
  });

  it('target tile functions include Pinky and Inky upward quirk', () => {
    const state = ready(createInitialState(baseLevel, options));
    state.pac.dir = { x: 0, y: -1 };
    const corners = findScatterCorners(state.width, state.height);
    const pinky = state.ghosts.find((ghost) => ghost.name === 'pinky');
    const inky = state.ghosts.find((ghost) => ghost.name === 'inky');
    expect(pinky).toBeDefined();
    expect(inky).toBeDefined();

    const pinkyTarget = targetTileForGhost(pinky!, state.pac, state.ghosts, corners);
    const inkyTarget = targetTileForGhost(inky!, state.pac, state.ghosts, corners);
    expect(pinkyTarget.x).toBeLessThan(Math.floor(state.pac.x));
    expect(pinkyTarget.y).toBeLessThan(Math.floor(state.pac.y));
    expect(inkyTarget.x).toBeLessThan(Math.floor(state.pac.x));
    expect(inkyTarget.y).toBeLessThan(Math.floor(state.pac.y));
  });

  it('supports deterministic frightened movement from injected RNG', () => {
    const deterministic: EngineOptions = {
      ...options,
      randomModeLevel: 5,
      levelIndex: 0,
      random: () => 0.75,
    };
    const state = ready(createInitialState(baseLevel, deterministic));
    state.mode = 'fright';
    state.frightenedTimer = 2;
    state.ghosts[0].state = 'frightened';
    const before = { ...state.ghosts[0].dir };
    step(state, {}, 0.1, deterministic);
    expect(state.ghosts[0].dir).not.toEqual(before);
  });
});
