'use client';

import dynamic from 'next/dynamic';

const WeatherApp = dynamic(() => import('./weather'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-ub-cool-grey text-white">
      Fetching forecast...
    </div>
  ),
});

export const displayWeather = () => <WeatherApp />;

displayWeather.prefetch = () => {
  if (typeof WeatherApp.preload === 'function') {
    WeatherApp.preload();
  }
};
