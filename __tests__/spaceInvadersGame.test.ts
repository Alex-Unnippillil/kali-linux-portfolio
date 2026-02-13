import { createEngine, FIXED_TIMESTEP_MS } from '../components/apps/space-invaders/engine/engine';
import { createInitialState } from '../components/apps/space-invaders/engine/state';
import { applyProgression, resolveCollisions, updateInvaders } from '../components/apps/space-invaders/engine/systems';

describe('space-invaders engine systems', () => {
  test('bullet vs invader collision increments score', () => {
    const state = createInitialState(480, 360, 0);
    const target = state.invaders[0];
    state.playerBullets.push({
      x: target.x + 3,
      y: target.y + 3,
      w: 2,
      h: 7,
      vy: 0,
      owner: 'player',
      active: true,
    });

    const events: Array<{ type: string }> = [];
    resolveCollisions(state, FIXED_TIMESTEP_MS, events as any);

    expect(target.alive).toBe(false);
    expect(state.score).toBeGreaterThan(0);
    expect(events.some((event) => event.type === 'invader-hit')).toBe(true);
  });

  test('bullet vs shield chips shield segments', () => {
    const state = createInitialState(480, 360, 0);
    const shield = state.shields[0];
    const before = shield.segments[0];
    state.playerBullets.push({
      x: shield.x + 1,
      y: shield.y + 1,
      w: 2,
      h: 7,
      vy: 0,
      owner: 'player',
      active: true,
    });

    const events: Array<{ type: string }> = [];
    resolveCollisions(state, FIXED_TIMESTEP_MS, events as any);

    expect(shield.segments[0]).toBeLessThan(before);
    expect(events.some((event) => event.type === 'shield-hit')).toBe(true);
  });

  test('alien bullet vs player consumes a life', () => {
    const state = createInitialState(480, 360, 0);
    state.invaderBullets.push({
      x: state.player.x + 2,
      y: state.player.y + 1,
      w: 2,
      h: 7,
      vy: 0,
      owner: 'invader',
      active: true,
    });

    resolveCollisions(state, FIXED_TIMESTEP_MS, []);
    expect(state.lives).toBe(2);
  });

  test('invader marching flips direction and steps down at edges', () => {
    const state = createInitialState(480, 360, 0);
    const invader = state.invaders[0];
    state.invaders.forEach((item) => {
      if (item.alive) item.x = state.width - item.w - 7;
    });
    const beforeY = invader.y;
    const beforeDir = state.invaderDir;
    state.invaderStepProgressMs = state.invaderMoveMs;

    updateInvaders(state, FIXED_TIMESTEP_MS);

    expect(state.invaderDir).toBe(beforeDir * -1);
    expect(invader.y).toBeGreaterThan(beforeY);
  });

  test('speed increases as invaders are removed', () => {
    const state = createInitialState(480, 360, 0);
    const initialSpeed = state.invaderMoveMs;
    state.invaders.slice(0, 20).forEach((invader) => {
      invader.alive = false;
    });
    state.invaderStepProgressMs = state.invaderMoveMs;

    updateInvaders(state, FIXED_TIMESTEP_MS);

    expect(state.invaderMoveMs).toBeLessThan(initialSpeed);
  });

  test('level progression triggers when all invaders are defeated', () => {
    const state = createInitialState(480, 360, 0);
    state.invaders.forEach((invader) => {
      invader.alive = false;
    });

    const events: Array<{ type: string }> = [];
    applyProgression(state, events as any);

    expect(state.level).toBe(2);
    expect(events.some((event) => event.type === 'level-clear')).toBe(true);
  });

  test('engine high score keeps previous stored best', () => {
    const engine = createEngine({ width: 480, height: 360, seed: 5 });
    engine.setHighScore(1234);
    engine.start();
    for (let i = 0; i < 20; i += 1) {
      engine.step(FIXED_TIMESTEP_MS, { left: false, right: false, fire: false });
    }
    expect(engine.getState().highScore).toBe(1234);
  });
});
