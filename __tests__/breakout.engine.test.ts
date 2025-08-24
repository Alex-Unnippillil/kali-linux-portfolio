import Ball from '../apps/breakout/Ball';

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
