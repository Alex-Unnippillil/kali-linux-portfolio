import dynamic from '@/utils/dynamic';

const WeatherWidget = dynamic(() => import('@/apps/weather_widget'), {
  ssr: false,
});

export default function WeatherWidgetPage() {
  return <WeatherWidget />;
}

