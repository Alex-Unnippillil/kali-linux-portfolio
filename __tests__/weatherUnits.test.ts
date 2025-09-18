import { convertTemperature, formatTemperature } from '../apps/weather/utils';

describe('weather unit conversions', () => {
  it('keeps metric values unchanged', () => {
    expect(convertTemperature(10, 'metric')).toBe(10);
    expect(convertTemperature(-5.5, 'metric')).toBe(-5.5);
  });

  it('converts to Fahrenheit when imperial', () => {
    expect(convertTemperature(0, 'imperial')).toBeCloseTo(32);
    expect(convertTemperature(25, 'imperial')).toBeCloseTo(77);
  });

  it('formats metric temperatures with symbol and rounding', () => {
    expect(formatTemperature(10.6, 'metric')).toBe('11°C');
    expect(formatTemperature(-2.2, 'metric')).toBe('-2°C');
  });

  it('formats imperial temperatures with symbol and rounding', () => {
    expect(formatTemperature(21.1, 'imperial')).toBe('70°F');
    expect(formatTemperature(-40, 'imperial')).toBe('-40°F');
  });
});
