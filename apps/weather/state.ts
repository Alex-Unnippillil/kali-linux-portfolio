'use client';

import usePersistentState from '../../hooks/usePersistentState';

export interface WeatherReading {
  temp: number;
  condition: number;
  time: number;
}

export interface City {
  id: string;
  name: string;
  lat: number;
  lon: number;
  lastReading?: WeatherReading;
}

const isWeatherReading = (v: any): v is WeatherReading =>
  v && typeof v.temp === 'number' && typeof v.condition === 'number' && typeof v.time === 'number';

const isCity = (v: any): v is City =>
  v &&
  typeof v.id === 'string' &&
  typeof v.name === 'string' &&
  typeof v.lat === 'number' &&
  typeof v.lon === 'number' &&
  (v.lastReading === undefined || isWeatherReading(v.lastReading));

const isCityArray = (v: unknown): v is City[] => Array.isArray(v) && v.every(isCity);

export default function useWeatherState() {
  return usePersistentState<City[]>('weather-cities', [], isCityArray);
}

