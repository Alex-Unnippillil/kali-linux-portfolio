import type { City, ForecastDay, WeatherReading } from '../state';

export interface WeatherResponse {
  reading: WeatherReading;
  forecast: ForecastDay[];
}

export interface WeatherProvider {
  id: string;
  label: string;
  fetch(city: City): Promise<WeatherResponse>;
}
