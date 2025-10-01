export type MeasurementSystem = 'metric' | 'imperial';
export type TimeFormat = '12h' | '24h';

export const normalizeMeasurementSystem = (value: unknown): MeasurementSystem =>
  value === 'imperial' ? 'imperial' : 'metric';

export const normalizeTimeFormat = (value: unknown): TimeFormat =>
  value === '12h' ? '12h' : '24h';
