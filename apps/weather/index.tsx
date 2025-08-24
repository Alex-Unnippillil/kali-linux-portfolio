import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Weather',
  description: 'Current conditions and 7 day forecast powered by Open-Meteo',
};

export { default, displayWeather } from '../../components/apps/weather';

