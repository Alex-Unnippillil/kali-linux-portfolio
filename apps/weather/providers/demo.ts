import type { WeatherProvider } from './types';
import type { ForecastDay } from '../state';

const buildDemoForecast = (base: number, start: number): ForecastDay[] =>
  Array.from({ length: 5 }, (_, idx) => ({
    date: new Date(start + idx * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    temp: base + idx,
    condition: (idx * 10) % 100,
  }));

const demo: WeatherProvider = {
  id: 'demo',
  label: 'Sample Data',
  async fetch(city) {
    const baseTemp = 10 + Math.round(Math.abs(city.lat) + Math.abs(city.lon));
    const now = Date.now();

    return {
      reading: {
        temp: baseTemp,
        condition: 0,
        time: now,
      },
      forecast: buildDemoForecast(baseTemp, now),
    };
  },
};

export default demo;
