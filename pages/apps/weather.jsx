import dynamic from '@/utils/dynamic';

const WeatherApp = dynamic(
  () =>
    import('../../apps/weather').catch((err) => {
      console.error('Failed to load Weather app', err);
      throw err;
    }),
);

export default WeatherApp;

