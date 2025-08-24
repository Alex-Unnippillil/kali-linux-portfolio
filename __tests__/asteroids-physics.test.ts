import Matter from 'matter-js';
import { createBullet, createRock, detectCollision, splitRock } from '@apps/asteroids/physics';

describe('asteroids physics', () => {
  test('bullet collides with rock', () => {
    const bullet = createBullet(0, 0, 0);
    const rock = createRock(0, 0, 20);
    expect(detectCollision(bullet, rock)).toBe(true);
  });

  test('splitRock creates two smaller rocks', () => {
    const engine = Matter.Engine.create();
    const rock = createRock(0, 0, 40);
    Matter.World.add(engine.world, rock);
    const parts = splitRock(engine.world, rock);
    expect(parts).toHaveLength(2);
    expect(parts.every((p) => (p as any).radius === 20)).toBe(true);
  });
});
