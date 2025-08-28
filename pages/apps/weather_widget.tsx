import dynamic from 'next/dynamic';
import AppLoader from '../../components/AppLoader';

const WeatherWidget = dynamic(() => import('../../apps/weather_widget'), {
  ssr: false,
  loading: () => <AppLoader />,
});

export default function WeatherWidgetPage() {
  return <WeatherWidget />;
}

