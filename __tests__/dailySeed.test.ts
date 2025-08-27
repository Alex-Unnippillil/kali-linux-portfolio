import { getDailySeed } from '../utils/seed';

test('daily seed consistent for given date', () => {
  const d = new Date('2024-02-03T10:20:00Z');
  expect(getDailySeed(d)).toBe('2024-02-03');
});
