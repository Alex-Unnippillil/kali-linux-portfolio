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

export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
  unit?: 'C' | 'F';
  lastReading?: WeatherReading;
  forecast?: ForecastDay[];
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
  (v.unit === undefined || v.unit === 'C' || v.unit === 'F') &&
  (v.lastReading === undefined || isWeatherReading(v.lastReading)) &&
  (v.forecast === undefined || isForecastArray(v.forecast));

const isCityArray = (v: unknown): v is City[] => Array.isArray(v) && v.every(isCity);

export default function useWeatherState() {
  return usePersistentState<City[]>('weather-cities', [], isCityArray);
}

