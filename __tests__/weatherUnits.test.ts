import { renderHook, act } from '@testing-library/react';
import {
  convertFromCelsius,
  convertToCelsius,
  formatTemperature,
  normalizeUnit,
} from '../apps/weather/units';
import { useWeatherUnit } from '../apps/weather/state';

describe('weather unit helpers', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  test('converts between Celsius and Fahrenheit', () => {
    expect(convertFromCelsius(0, 'imperial')).toBeCloseTo(32);
    expect(convertFromCelsius(25, 'imperial')).toBeCloseTo(77);
    expect(convertFromCelsius(10, 'metric')).toBeCloseTo(10);

    expect(convertToCelsius(32, 'imperial')).toBeCloseTo(0);
    expect(convertToCelsius(77, 'imperial')).toBeCloseTo(25);
    expect(convertToCelsius(10, 'metric')).toBeCloseTo(10);
  });

  test('formats temperature strings with unit symbol', () => {
    expect(formatTemperature(20, 'metric')).toBe('20°C');
    expect(formatTemperature(20, 'imperial')).toBe('68°F');
    expect(formatTemperature(21.2, 'metric', { maximumFractionDigits: 1 })).toBe(
      '21.2°C',
    );
  });

  test('normalizes unexpected unit values', () => {
    expect(normalizeUnit('metric')).toBe('metric');
    expect(normalizeUnit('imperial')).toBe('imperial');
    expect(normalizeUnit('kelvin')).toBe('metric');
  });

  test('persists selected unit to localStorage', () => {
    const { result } = renderHook(() => useWeatherUnit());
    expect(result.current[0]).toBe('metric');

    act(() => {
      result.current[1]('imperial');
    });

    const stored = window.localStorage.getItem('weather-unit');
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored as string)).toBe('imperial');

    const { result: second } = renderHook(() => useWeatherUnit());
    expect(second.current[0]).toBe('imperial');
  });

  test('falls back to metric when stored unit is invalid', () => {
    window.localStorage.setItem('weather-unit', JSON.stringify('kelvin'));
    const { result } = renderHook(() => useWeatherUnit());
    expect(result.current[0]).toBe('metric');
  });
});
