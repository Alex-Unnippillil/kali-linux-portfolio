import dynamic from 'next/dynamic';
import UbuntuWindow from '../../components/UbuntuWindow';

const Weather = dynamic(() => import('../../apps/weather'), { ssr: false });

export default function WeatherPage() {
  return (
    <UbuntuWindow title="weather">
      <Weather />
    </UbuntuWindow>
  );
}
