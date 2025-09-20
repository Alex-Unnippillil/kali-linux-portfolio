import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../app-skeletons';

const WeatherWidget = dynamic(() => import('../../apps/weather_widget'), {
  ssr: false,
  loading: () => getAppSkeleton('weather_widget', 'Weather Widget'),
});

export default WeatherWidget;
