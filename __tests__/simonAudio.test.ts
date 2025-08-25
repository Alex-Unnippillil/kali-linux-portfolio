import { createToneSchedule } from '../components/apps/simon';

describe('createToneSchedule', () => {
  test('tone schedule drift under 5 ms per step across 20 steps', () => {
    const schedule = createToneSchedule(20, 0, 0.6);
    schedule.forEach((time, idx) => {
      const expected = idx * 0.6;
      const drift = Math.abs(time - expected);
      expect(drift).toBeLessThan(0.005);
    });
  });
});
