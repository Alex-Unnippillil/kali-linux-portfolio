import dynamic from 'next/dynamic';

export { fetchWeather } from './weather';

const WeatherWidget = dynamic(() => import('../../apps/weather_widget'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default WeatherWidget;

export const displayWeatherWidget = () => <WeatherWidget />;
