import { WeatherUnits } from './state';

const FAHRENHEIT_FACTOR = 9 / 5;

export function convertTemperature(value: number, units: WeatherUnits): number {
  if (!Number.isFinite(value)) {
    return value;
  }

  return units === 'imperial' ? value * FAHRENHEIT_FACTOR + 32 : value;
}

export function formatTemperature(value: number, units: WeatherUnits): string {
  const converted = convertTemperature(value, units);
  const rounded = Math.round(converted);
  const suffix = units === 'imperial' ? '°F' : '°C';
  return `${rounded}${suffix}`;
}
