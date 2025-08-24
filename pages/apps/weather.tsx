import dynamic from 'next/dynamic';

const WeatherApp = dynamic(() => import('../../components/apps/weather'), { ssr: false });

export default function WeatherPage() {
  return <WeatherApp />;
}
