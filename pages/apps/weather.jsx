import dynamic from '@/utils/dynamic';

const WeatherApp = dynamic(() => import('@/apps/weather'), {
  ssr: false,
});

export default WeatherApp;

