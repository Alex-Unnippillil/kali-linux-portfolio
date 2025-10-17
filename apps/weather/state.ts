'use client';

import { useEffect, useRef } from 'react';
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

const isCityGroup = (v: any): v is CityGroup =>
  v && typeof v.name === 'string' && isCityArray(v.cities);

const isCityGroupArray = (v: unknown): v is CityGroup[] =>
  Array.isArray(v) && v.every(isCityGroup);

export default function useWeatherState() {
  const [cities, setCities, resetCities, clearCities] =
    usePersistentState<City[]>('weather-cities', [], isCityArray);
  const previousCitiesRef = useRef<City[]>(cities);

  useEffect(() => {
    const previous = previousCitiesRef.current;
    const previousIds = new Set(previous.map((city) => city.id));
    const currentIds = new Set(cities.map((city) => city.id));
    const removedIds = Array.from(previousIds).filter(
      (id) => !currentIds.has(id),
    );

    if (
      removedIds.length > 0 &&
      typeof window !== 'undefined'
    ) {
      try {
        const stored = window.localStorage.getItem('weather-city-groups');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (isCityGroupArray(parsed)) {
            let mutated = false;
            const next = parsed.map((group) => {
              const filtered = group.cities.filter(
                (city) => !removedIds.includes(city.id),
              );
              if (filtered.length !== group.cities.length) {
                mutated = true;
                return { ...group, cities: filtered };
              }
              return group;
            });
            if (mutated) {
              window.localStorage.setItem(
                'weather-city-groups',
                JSON.stringify(next),
              );
            }
          }
        }
      } catch {
        // ignore persistence errors
      }
    }

    previousCitiesRef.current = cities;
  }, [cities]);

  return [cities, setCities, resetCities, clearCities] as const;
}

export function useWeatherGroups() {
  return usePersistentState<CityGroup[]>('weather-city-groups', [], isCityGroupArray);
}

const isStringOrNull = (v: unknown): v is string | null =>
  v === null || typeof v === 'string';

export function useCurrentGroup() {
  return usePersistentState<string | null>('weather-current-group', null, isStringOrNull);
}

