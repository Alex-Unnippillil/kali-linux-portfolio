import Ball from '../apps/breakout/Ball';
import { collideBallRect } from '../apps/breakout/physics';
import Brick from '../apps/breakout/Brick';

test('ball updates with fixed timestep', () => {
  const b1 = new Ball(100, 100);
  b1.vx = 100;
  for (let i = 0; i < 60; i += 1) b1.update(1 / 60);
  const b2 = new Ball(100, 100);
  b2.vx = 100;
  b2.update(1);
  expect(Math.abs(b1.x - b2.x)).toBeLessThan(0.01);
});

test('ball does not tunnel through wall at high speed', () => {
  const b = new Ball(100, 100);
  b.x = b.r + 1;
  b.vx = -700;
  b.update(0.2);
  expect(b.x).toBeGreaterThanOrEqual(b.r);
});

test('ball bounces off paddle with spin', () => {
  const b = new Ball(200, 200);
  b.x = 100;
  b.y = 106;
  b.vx = 0;
  b.vy = 100;
  collideBallRect(b, { x: 80, y: 110, w: 40, h: 10 }, 50);
  expect(b.vy).toBeLessThan(0);
  expect(b.vx).toBeGreaterThan(0);
});

test('durable brick survives one hit', () => {
  const br = new Brick(0, 0, 10, 10, null, 2);
  br.hit();
  expect(br.destroyed).toBe(false);
  br.hit();
  expect(br.destroyed).toBe(true);
});

test('power brick reports type', () => {
  const br = new Brick(0, 0, 10, 10, 'laser', 1);
  expect(br.type).toBe('power');
});
