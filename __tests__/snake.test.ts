import { moveSnake, calcSpeed, speedLevels, SPEED_INTERVAL, SPEED_STEP } from '../components/apps/snake';

describe('snake mechanics', () => {
  test('self-collision ends game', () => {
    const snake = [
      { x: 2, y: 2 },
      { x: 1, y: 2 },
      { x: 1, y: 1 },
      { x: 2, y: 1 },
    ];
    const dir = { x: -1, y: 0 };
    const { dead } = moveSnake(snake, dir, false, []);
    expect(dead).toBe(true);
  });

  test('speed increases after N foods', () => {
    let speed = speedLevels.normal;
    for (let i = 1; i <= SPEED_INTERVAL; i += 1) {
      speed = calcSpeed(i, speed);
    }
    expect(speed).toBe(speedLevels.normal - SPEED_STEP);
  });
});
