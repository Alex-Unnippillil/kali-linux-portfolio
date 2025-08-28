import dynamic from 'next/dynamic';
import AppLoader from '../AppLoader';

const WeatherWidget = dynamic(() => import('../../apps/weather_widget'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default WeatherWidget;
