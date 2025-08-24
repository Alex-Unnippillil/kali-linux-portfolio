import Bird from '@apps/flappy-bird/bird';
import Pipe from '@apps/flappy-bird/pipe';
import { getMedal } from '@apps/flappy-bird/medals';

test('pipes reset within bounds', () => {
  const p = new Pipe(300, 100, 40, 300);
  p.reset(300, 0);
  expect(p.top).toBeGreaterThanOrEqual(20);
  expect(p.bottom).toBeLessThanOrEqual(280);
  expect(p.bottom - p.top).toBeGreaterThanOrEqual(50);
});

test('collision detection respects forgiving hitbox', () => {
  const bird = new Bird(60, 150, 1);
  const pipe = new Pipe(50, 80, 40, 300);
  pipe.top = 100;
  pipe.bottom = 180;
  expect(pipe.collides(bird)).toBe(false);
  bird.y = 90;
  expect(pipe.collides(bird)).toBe(true);
});

test('medal thresholds', () => {
  expect(getMedal(5)).toBe(null);
  expect(getMedal(10)).toBe('Bronze');
  expect(getMedal(20)).toBe('Silver');
  expect(getMedal(30)).toBe('Gold');
});
