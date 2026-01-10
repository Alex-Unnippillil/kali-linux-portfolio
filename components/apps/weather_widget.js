import dynamic from 'next/dynamic';
import { createLiveRegionLoader } from './createLiveRegionLoader';

export { fetchWeather } from './weather';

const WeatherWidget = dynamic(() => import('../../apps/weather_widget'), {
  ssr: false,
  loading: createLiveRegionLoader('Loading Weather Widget...', {
    className: 'flex min-h-[4rem] w-full items-center justify-center rounded bg-ub-cool-grey px-4 py-3 text-center',
  }),
});

export default WeatherWidget;

export const displayWeatherWidget = () => <WeatherWidget />;
