'use client';

import usePersistentState from '../../hooks/usePersistentState';

export interface WeatherReading {
  temp: number;
  condition: number;
  time: number;
}

export interface ForecastDay {
  date: string;
  temp: number;
  condition: number;
}

export interface HourlySnapshot {
  temps: number[];
  times?: string[];
  precipProbability?: number[];
  updatedAt: number;
}

export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
  region?: string;
  countryCode?: string;
  timezone?: string;
  lastReading?: WeatherReading;
  lastReadingStale?: boolean;
  forecast?: ForecastDay[];
  hourly?: HourlySnapshot;
  hourlyStale?: boolean;
  lastError?: string;
  isDemo?: boolean;
}

export interface CityGroup {
  name: string;
  cities: City[];
}

const isWeatherReading = (v: any): v is WeatherReading =>
  v &&
  typeof v.temp === 'number' &&
  typeof v.condition === 'number' &&
  typeof v.time === 'number';

const isForecastDay = (v: any): v is ForecastDay =>
  v &&
  typeof v.date === 'string' &&
  typeof v.temp === 'number' &&
  typeof v.condition === 'number';

const isForecastArray = (v: any): v is ForecastDay[] => Array.isArray(v) && v.every(isForecastDay);

const isNumberArray = (v: unknown): v is number[] =>
  Array.isArray(v) && v.every((entry) => typeof entry === 'number');

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((entry) => typeof entry === 'string');

const isHourlySnapshot = (v: any): v is HourlySnapshot =>
  v &&
  isNumberArray(v.temps) &&
  (v.times === undefined || isStringArray(v.times)) &&
  (v.precipProbability === undefined || isNumberArray(v.precipProbability)) &&
  typeof v.updatedAt === 'number';

const isCity = (v: any): v is City =>
  v &&
  typeof v.id === 'string' &&
  typeof v.name === 'string' &&
  typeof v.lat === 'number' &&
  typeof v.lon === 'number' &&
  (v.region === undefined || typeof v.region === 'string') &&
  (v.countryCode === undefined || typeof v.countryCode === 'string') &&
  (v.timezone === undefined || typeof v.timezone === 'string') &&
  (v.lastReading === undefined || isWeatherReading(v.lastReading)) &&
  (v.lastReadingStale === undefined || typeof v.lastReadingStale === 'boolean') &&
  (v.forecast === undefined || isForecastArray(v.forecast)) &&
  (v.hourly === undefined || isHourlySnapshot(v.hourly)) &&
  (v.hourlyStale === undefined || typeof v.hourlyStale === 'boolean') &&
  (v.lastError === undefined || typeof v.lastError === 'string') &&
  (v.isDemo === undefined || typeof v.isDemo === 'boolean');

const isCityArray = (v: unknown): v is City[] => Array.isArray(v) && v.every(isCity);

export default function useWeatherState() {
  return usePersistentState<City[]>('weather-cities', [], isCityArray);
}

const isCityGroup = (v: any): v is CityGroup =>
  v && typeof v.name === 'string' && isCityArray(v.cities);

const isCityGroupArray = (v: unknown): v is CityGroup[] =>
  Array.isArray(v) && v.every(isCityGroup);

export function useWeatherGroups() {
  return usePersistentState<CityGroup[]>('weather-city-groups', [], isCityGroupArray);
}

const isStringOrNull = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

export function useCurrentGroup() {
  return usePersistentState<string | null>('weather-current-group', null, isStringOrNull);
}
