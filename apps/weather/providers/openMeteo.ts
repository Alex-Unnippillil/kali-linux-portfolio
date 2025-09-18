import type { WeatherProvider } from './types';
import type { ForecastDay } from '../state';

const buildForecast = (data: any): ForecastDay[] => {
  const times: unknown[] = data?.daily?.time ?? [];
  const temps: unknown[] = data?.daily?.temperature_2m_max ?? [];
  const codes: unknown[] = data?.daily?.weathercode ?? [];

  if (!Array.isArray(times)) return [];

  return times
    .map((date, idx) => {
      if (typeof date !== 'string') return null;
      const temp = typeof temps[idx] === 'number' ? temps[idx] : null;
      const condition = typeof codes[idx] === 'number' ? codes[idx] : null;
      if (temp === null || condition === null) return null;
      return {
        date,
        temp,
        condition,
      } satisfies ForecastDay;
    })
    .filter((value): value is ForecastDay => value !== null);
};

const openMeteo: WeatherProvider = {
  id: 'open-meteo',
  label: 'Open-Meteo',
  async fetch(city) {
    const params = new URLSearchParams({
      latitude: String(city.lat),
      longitude: String(city.lon),
      current_weather: 'true',
      daily: 'weathercode,temperature_2m_max',
      forecast_days: '5',
      timezone: 'auto',
    });

    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
    if (!response.ok) {
      throw new Error('Weather request failed');
    }

    const data = await response.json();
    const current = data?.current_weather;
    if (!current || typeof current.temperature !== 'number' || typeof current.weathercode !== 'number') {
      throw new Error('Malformed weather data');
    }

    return {
      reading: {
        temp: current.temperature,
        condition: current.weathercode,
        time: Date.now(),
      },
      forecast: buildForecast(data),
    };
  },
};

export default openMeteo;
