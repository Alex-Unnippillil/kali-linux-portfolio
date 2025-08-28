import dynamic from 'next/dynamic';

const WeatherWidget = dynamic(() => import('../../apps/weather_widget'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default WeatherWidget;
