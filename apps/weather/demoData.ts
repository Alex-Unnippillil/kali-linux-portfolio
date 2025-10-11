import type { City, ForecastDay, WeatherReading } from './state';

export interface DemoWeatherSnapshot {
  reading: WeatherReading;
  forecast: ForecastDay[];
  hourly: number[];
  precipitationChance: number;
}

const WEATHER_CODES = [0, 1, 2, 3, 45, 51, 61, 63, 65, 71, 80, 95];

const MIN_TEMP = -18;
const MAX_TEMP = 42;

function createSeed(lat: number, lon: number): number {
  const latSeed = Math.round((lat + 90) * 1000);
  const lonSeed = Math.round((lon + 180) * 1000);
  return (latSeed << 16) ^ lonSeed;
}

function daySeed(): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor(today.getTime() / 86400000);
}

function seededRandom(seed: number) {
  let state = seed % 2147483647;
  if (state <= 0) {
    state += 2147483646;
  }
  return () => {
    state = (state * 16807) % 2147483647;
    return (state - 1) / 2147483646;
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function observationTimestamp(seed: number): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const offset = (seed % (12 * 60 * 60 * 1000)) + 6 * 60 * 60 * 1000;
  return today.getTime() + offset;
}

function formatForecastDate(offset: number): string {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  return date.toISOString().split('T')[0];
}

export function buildDemoWeather(city: Pick<City, 'lat' | 'lon' | 'id' | 'name'>): DemoWeatherSnapshot {
  const baseSeed = createSeed(city.lat, city.lon) + daySeed();
  const random = seededRandom(baseSeed);
  const latitudeInfluence = (1 - Math.abs(city.lat) / 90) * 25;
  const variability = random() * 10 - 5;
  const currentTemp = clamp(latitudeInfluence + variability, MIN_TEMP, MAX_TEMP);
  const condition = WEATHER_CODES[Math.floor(random() * WEATHER_CODES.length)];

  const forecast: ForecastDay[] = Array.from({ length: 5 }).map((_, index) => {
    const swing = (random() - 0.5) * 8;
    const temp = clamp(currentTemp + swing, MIN_TEMP, MAX_TEMP);
    const code = WEATHER_CODES[Math.floor(random() * WEATHER_CODES.length)];
    return {
      date: formatForecastDate(index + 1),
      temp: Number(temp.toFixed(1)),
      condition: code,
    };
  });

  const hourly: number[] = Array.from({ length: 24 }).map((_, hour) => {
    const cycle = Math.sin((hour / 24) * Math.PI * 2 - Math.PI / 2);
    const noise = (random() - 0.5) * 2;
    const temp = clamp(currentTemp + cycle * 6 + noise, MIN_TEMP, MAX_TEMP);
    return Number(temp.toFixed(1));
  });

  const precipitationChance = Math.round(random() * 80);

  const reading: WeatherReading = {
    temp: Number(currentTemp.toFixed(1)),
    condition,
    time: observationTimestamp(baseSeed),
  };

  return {
    reading,
    forecast,
    hourly,
    precipitationChance,
  };
}
