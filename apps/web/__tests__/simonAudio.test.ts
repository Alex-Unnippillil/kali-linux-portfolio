import { createToneSchedule } from '../utils/audio';

describe('createToneSchedule', () => {
  test('tone schedule jitter under 10 ms per step across 20 steps', () => {
    const schedule = createToneSchedule(20, 0, 0.6);
    schedule.forEach((time, idx) => {
      const expected = idx * 0.6;
      const drift = Math.abs(time - expected);
      expect(drift).toBeLessThan(0.01);
    });
  });

  test('applies ramp factor to step durations', () => {
    const schedule = createToneSchedule(3, 0, 1, 0.5);
    const first = schedule[1] - schedule[0];
    const second = schedule[2] - schedule[1];
    expect(second).toBeCloseTo(first * 0.5, 5);
  });
});
