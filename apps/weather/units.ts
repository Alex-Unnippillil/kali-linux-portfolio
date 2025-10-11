export type TemperatureUnit = 'metric' | 'imperial';

export const UNIT_SYMBOL: Record<TemperatureUnit, string> = {
  metric: '°C',
  imperial: '°F',
};

export function isTemperatureUnit(value: unknown): value is TemperatureUnit {
  return value === 'metric' || value === 'imperial';
}

export function convertFromCelsius(value: number, unit: TemperatureUnit): number {
  if (unit === 'imperial') {
    return value * 1.8 + 32;
  }
  return value;
}

export function convertToCelsius(value: number, unit: TemperatureUnit): number {
  if (unit === 'imperial') {
    return (value - 32) / 1.8;
  }
  return value;
}

export function formatTemperature(
  valueInCelsius: number,
  unit: TemperatureUnit,
  options?: { maximumFractionDigits?: number },
): string {
  const digits = options?.maximumFractionDigits ?? 0;
  const converted = convertFromCelsius(valueInCelsius, unit);
  const fixed = converted.toFixed(digits);
  const numeric = digits === 0 ? Math.round(converted).toString() : parseFloat(fixed).toString();
  return `${numeric}${UNIT_SYMBOL[unit]}`;
}

export function normalizeUnit(value: unknown, fallback: TemperatureUnit = 'metric'): TemperatureUnit {
  return isTemperatureUnit(value) ? value : fallback;
}

export function toggleUnit(unit: TemperatureUnit): TemperatureUnit {
  return unit === 'metric' ? 'imperial' : 'metric';
}
