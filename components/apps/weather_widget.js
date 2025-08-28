import dynamic from 'next/dynamic';

const WeatherWidget = dynamic(() => import('../../apps/weather_widget'), {
  ssr: false,
});

export default WeatherWidget;
