import dynamic from 'next/dynamic';

const WeatherApp = dynamic(
  () =>
    import('../../apps/weather').catch((err) => {
      console.error('Failed to load Weather app', err);
      throw err;
    }),
  {
    ssr: false,
    loading: () => <p>Loading...</p>,
  }
);

export default WeatherApp;

