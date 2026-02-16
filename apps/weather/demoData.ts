import baseDemoCity from '../weather_widget/demoCity.json';
import type { City, ForecastDay, HourlySnapshot } from './state';

interface WidgetDemoCity {
  label: string;
  temperatureC: number;
  conditionCode: number;
  forecast: Array<{ date: string; tempC: number; conditionCode: number }>;
}

const widgetDemo = baseDemoCity as WidgetDemoCity;

const DEFAULT_FORECAST_CODES = [3, 2, 61, 1, 0];

const dateOffset = (days: number) => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const hourlyTimes = () => {
  const base = new Date();
  base.setMinutes(0, 0, 0);
  return Array.from({ length: 24 }, (_, idx) => {
    const next = new Date(base);
    next.setHours(base.getHours() + idx);
    return next.toISOString();
  });
};

const buildForecast = (
  baseTemp: number,
  conditionCodes: number[] = DEFAULT_FORECAST_CODES,
): ForecastDay[] =>
  Array.from({ length: 5 }, (_, idx) => ({
    date: dateOffset(idx),
    temp: Math.round(baseTemp + (idx % 2 === 0 ? idx : idx - 2)),
    condition: conditionCodes[idx] ?? DEFAULT_FORECAST_CODES[idx] ?? 3,
  }));

const buildHourly = (baseTemp: number): HourlySnapshot => {
  const times = hourlyTimes();
  const temps = times.map((_, idx) => {
    const wave = Math.sin((idx / 24) * Math.PI * 2);
    return Math.round((baseTemp + wave * 4) * 10) / 10;
  });
  const precipProbability = times.map((_, idx) => (idx % 6 === 0 ? 35 : 15));
  return {
    temps,
    times,
    precipProbability,
    updatedAt: Date.now(),
  };
};

const [widgetName, widgetRegion, widgetCountry] = widgetDemo.label
  .split(',')
  .map((part) => part.trim());

export function buildDemoCities(): City[] {
  const londonBase: City = {
    id: 'demo:london',
    name: widgetName || 'London',
    region: widgetRegion,
    countryCode: widgetCountry,
    lat: 51.5072,
    lon: -0.1276,
    timezone: 'Europe/London',
    isDemo: true,
    lastReading: {
      temp: widgetDemo.temperatureC,
      condition: widgetDemo.conditionCode,
      time: Date.now(),
    },
    forecast: widgetDemo.forecast.map((entry, idx) => ({
      date: dateOffset(idx),
      temp: entry.tempC,
      condition: entry.conditionCode,
    })),
    hourly: buildHourly(widgetDemo.temperatureC),
  };

  const extras = [
    {
      id: 'demo:tokyo',
      name: 'Tokyo',
      region: 'Tokyo',
      countryCode: 'JP',
      lat: 35.6764,
      lon: 139.6500,
      timezone: 'Asia/Tokyo',
      temp: 22,
      condition: 1,
      codes: [1, 2, 3, 61, 2],
    },
    {
      id: 'demo:san-francisco',
      name: 'San Francisco',
      region: 'California',
      countryCode: 'US',
      lat: 37.7749,
      lon: -122.4194,
      timezone: 'America/Los_Angeles',
      temp: 17,
      condition: 2,
      codes: [2, 2, 3, 3, 1],
    },
    {
      id: 'demo:singapore',
      name: 'Singapore',
      countryCode: 'SG',
      lat: 1.3521,
      lon: 103.8198,
      timezone: 'Asia/Singapore',
      temp: 30,
      condition: 61,
      codes: [61, 63, 3, 61, 2],
    },
  ];

  const demoCities: City[] = extras.map((city) => ({
    id: city.id,
    name: city.name,
    region: city.region,
    countryCode: city.countryCode,
    lat: city.lat,
    lon: city.lon,
    timezone: city.timezone,
    isDemo: true,
    lastReading: {
      temp: city.temp,
      condition: city.condition,
      time: Date.now(),
    },
    forecast: buildForecast(city.temp, city.codes),
    hourly: buildHourly(city.temp),
  }));

  return [londonBase, ...demoCities];
}
