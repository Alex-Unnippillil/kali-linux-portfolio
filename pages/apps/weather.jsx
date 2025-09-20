import dynamic from 'next/dynamic';
import { getAppSkeleton } from '../../components/app-skeletons';

const WeatherApp = dynamic(
  () =>
    import('../../apps/weather').catch((err) => {
      console.error('Failed to load Weather app', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => getAppSkeleton('weather', 'Weather'),
  }
);

export default WeatherApp;
