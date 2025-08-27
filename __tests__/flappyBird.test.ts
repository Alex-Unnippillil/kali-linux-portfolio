import { flapBird, calculateGap, createState, resetState } from '../components/apps/flappy-bird';

describe('Flappy Bird mechanics', () => {
  test('tap latency low', () => {
    const bird = { x: 0, y: 0, vy: 0 };
    const start = performance.now();
    flapBird(bird, -8);
    const elapsed = performance.now() - start;
    expect(bird.vy).toBe(-8);
    expect(elapsed).toBeLessThan(5);
  });

  test('difficulty curve visible', () => {
    const initialGap = calculateGap(0);
    const laterGap = calculateGap(10);
    expect(laterGap).toBeLessThan(initialGap);
  });

  test('collision resets', () => {
    const state = createState(400, 300);
    state.bird.y = 0;
    state.score = 5;
    state.pipes.push({ x: 10, top: 10, bottom: 60 });
    resetState(state, 400, 300);
    expect(state.bird.y).toBe(150);
    expect(state.score).toBe(0);
    expect(state.pipes.length).toBe(0);
  });
});
