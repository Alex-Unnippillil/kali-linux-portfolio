import dynamic from 'next/dynamic';

const WeatherApp = dynamic(() => import('../../apps/weather'), { ssr: false });

export default function WeatherPage() {
  return <WeatherApp />;
}
