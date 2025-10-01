import type { MeasurementSystem, TimeFormat } from '../types/preferences';
import { normalizeMeasurementSystem, normalizeTimeFormat } from '../types/preferences';

export const getTemperatureUnit = (system: MeasurementSystem): '°C' | '°F' =>
  system === 'imperial' ? '°F' : '°C';

export const convertTemperatureValue = (
  value: number,
  system: MeasurementSystem,
): number => {
  const normalized = normalizeMeasurementSystem(system);
  if (!Number.isFinite(value)) return value;
  return normalized === 'imperial' ? (value * 9) / 5 + 32 : value;
};

export const convertTemperatureSeries = (
  values: number[],
  system: MeasurementSystem,
): number[] => values.map((value) => convertTemperatureValue(value, system));

interface FormatTemperatureOptions {
  maximumFractionDigits?: number;
}

export const formatTemperature = (
  celsiusValue: number | null | undefined,
  system: MeasurementSystem,
  { maximumFractionDigits = 0 }: FormatTemperatureOptions = {},
): string => {
  if (typeof celsiusValue !== 'number' || Number.isNaN(celsiusValue)) {
    return '—';
  }
  const normalized = normalizeMeasurementSystem(system);
  const converted = convertTemperatureValue(celsiusValue, normalized);
  const formatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  });
  return `${formatter.format(converted)}${getTemperatureUnit(normalized)}`;
};

export const formatDataSize = (
  bytes?: number,
  system?: MeasurementSystem,
): string => {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '—';
  const normalized = normalizeMeasurementSystem(system ?? 'metric');
  const base = normalized === 'imperial' ? 1024 : 1000;
  const units = normalized === 'imperial'
    ? ['B', 'KiB', 'MiB', 'GiB', 'TiB', 'PiB']
    : ['B', 'kB', 'MB', 'GB', 'TB', 'PB'];
  const sign = bytes < 0 ? -1 : 1;
  let value = Math.abs(bytes);
  let unitIndex = 0;
  while (value >= base && unitIndex < units.length - 1) {
    value /= base;
    unitIndex += 1;
  }
  const formatter = new Intl.NumberFormat(undefined, {
    maximumFractionDigits: value < 10 && unitIndex > 0 ? 1 : 0,
  });
  const formattedValue = formatter.format(value * sign);
  return `${formattedValue} ${units[unitIndex]}`;
};

export const formatTimeOfDay = (
  date: Date,
  timeFormat: TimeFormat,
  options: Intl.DateTimeFormatOptions = {},
): string => {
  const normalized = normalizeTimeFormat(timeFormat);
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    hour12: normalized === '12h',
    ...options,
  });
};

export const formatTimelineTick = (
  date: Date,
  tickMinutes: number,
  timeFormat: TimeFormat,
): string => {
  if (tickMinutes >= 1440) {
    return date.toLocaleDateString();
  }
  if (tickMinutes >= 60) {
    return formatTimeOfDay(date, timeFormat, { minute: undefined });
  }
  return formatTimeOfDay(date, timeFormat);
};

export { normalizeMeasurementSystem, normalizeTimeFormat };
