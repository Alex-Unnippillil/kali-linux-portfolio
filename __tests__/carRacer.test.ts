import { checkCollision } from '../components/apps/car-racer';

describe('car racer collision detection', () => {
  test('detects overlap in same lane', () => {
    const car = { lane: 1, y: 100, height: 40 };
    expect(
      checkCollision(car, { lane: 1, y: 120, height: 30 })
    ).toBe(true);
    expect(
      checkCollision(car, { lane: 2, y: 120, height: 30 })
    ).toBe(false);
    expect(
      checkCollision(car, { lane: 1, y: 200, height: 30 })
    ).toBe(false);
  });
});

