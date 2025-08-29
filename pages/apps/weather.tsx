import dynamic from 'next/dynamic';

const WeatherApp = dynamic(() => import('../../apps/weather'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

export default function WeatherPage() {
  return <WeatherApp />;
}
