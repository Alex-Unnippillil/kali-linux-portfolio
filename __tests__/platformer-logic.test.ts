import { parseLevel, physics, step, TILE_SIZE } from '../games/platformer/logic';

describe('platformer logic', () => {
  const baseState = (levelGrid: string[]) => {
    const level = parseLevel(levelGrid);
    return {
      level,
      player: {
        x: level.spawn.x + (TILE_SIZE - 20) / 2,
        y: level.spawn.y - 40,
        w: 20,
        h: 28,
        vx: 0,
        vy: 0,
        onGround: false,
        onPlatformId: null,
        facing: 1 as const,
      },
      time: 0,
      coinsCollected: 0,
      deaths: 0,
      status: 'running' as const,
      respawnTimer: 0,
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      camera: { x: level.spawn.x, y: level.spawn.y },
      shake: { time: 0, magnitude: 0 },
    };
  };

  test('player lands on solid ground using axis separation', () => {
    const state = baseState([
      '.....',
      '..S..',
      '.....',
      '#####',
    ]);
    let current = { ...state };
    const input = { left: false, right: false, jumpPressed: false, jumpHeld: false, jumpReleased: false };
    for (let i = 0; i < 30; i += 1) {
      current = step(current, input, 1 / 60);
    }
    const groundTop = (3 * TILE_SIZE) - current.player.h;
    expect(current.player.y).toBeCloseTo(groundTop, 0);
    expect(current.player.onGround).toBe(true);
  });

  test('jump buffer honors coyote time', () => {
    const state = baseState([
      '.....',
      '..S..',
      '#####',
    ]);
    const input = { left: false, right: false, jumpPressed: true, jumpHeld: true, jumpReleased: false };
    const withCoyote = { ...state, coyoteTimer: physics.coyoteTime * 0.5 };
    const next = step(withCoyote, input, 1 / 60);
    expect(next.player.vy).toBe(physics.jumpVelocity);
    expect(next.jumpBufferTimer).toBe(0);
  });
});
