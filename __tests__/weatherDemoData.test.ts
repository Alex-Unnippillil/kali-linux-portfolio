import { buildDemoWeather } from '../apps/weather/demoData';

describe('buildDemoWeather', () => {
  const city = { id: 'test', name: 'Test City', lat: 40.71, lon: -74.01 };

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2024-01-01T00:00:00Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('returns deterministic results for the same city on the same day', () => {
    const first = buildDemoWeather(city);
    const second = buildDemoWeather(city);

    expect(first).toEqual(second);
    expect(first.forecast).toHaveLength(5);
    expect(first.hourly).toHaveLength(24);
    expect(first.precipitationChance).toBeGreaterThanOrEqual(0);
    expect(first.precipitationChance).toBeLessThanOrEqual(100);
  });

  test('changes observation timestamp across days', () => {
    const first = buildDemoWeather(city);
    jest.setSystemTime(new Date('2024-01-02T00:00:00Z'));
    const second = buildDemoWeather(city);
    expect(second.reading.time).not.toBe(first.reading.time);
  });
});
