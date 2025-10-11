'use client';

import usePersistentState from '../../hooks/usePersistentState';
import { TemperatureUnit, isTemperatureUnit } from './units';

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

export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
  lastReading?: WeatherReading;
  forecast?: ForecastDay[];
}

export interface CityGroup {
  name: string;
  cities: City[];
}

const isWeatherReading = (v: any): v is WeatherReading =>
  v && typeof v.temp === 'number' && typeof v.condition === 'number' && typeof v.time === 'number';

const isForecastDay = (v: any): v is ForecastDay =>
  v && typeof v.date === 'string' && typeof v.temp === 'number' && typeof v.condition === 'number';

const isForecastArray = (v: any): v is ForecastDay[] => Array.isArray(v) && v.every(isForecastDay);

const isCity = (v: any): v is City =>
  v &&
  typeof v.id === 'string' &&
  typeof v.name === 'string' &&
  typeof v.lat === 'number' &&
  typeof v.lon === 'number' &&
  (v.lastReading === undefined || isWeatherReading(v.lastReading)) &&
  (v.forecast === undefined || isForecastArray(v.forecast));

const isCityArray = (v: unknown): v is City[] => Array.isArray(v) && v.every(isCity);

const DEFAULT_CITIES: City[] = [
  { id: 'berlin-52.52-13.405', name: 'Berlin', lat: 52.52, lon: 13.405 },
  { id: 'singapore-1.3521-103.8198', name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { id: 'new-york-40.7128--74.006', name: 'New York', lat: 40.7128, lon: -74.006 },
  { id: 'sydney--33.8688-151.2093', name: 'Sydney', lat: -33.8688, lon: 151.2093 },
];

const createDefaultCities = () => DEFAULT_CITIES.map((city) => ({ ...city }));

export default function useWeatherState() {
  return usePersistentState<City[]>(
    'weather-cities',
    createDefaultCities,
    isCityArray,
  );
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

export function useWeatherUnit() {
  return usePersistentState<TemperatureUnit>(
    'weather-unit',
    'metric',
    isTemperatureUnit,
  );
}

