import React from 'react';
import { withGameErrorBoundary } from './GameErrorBoundary';

const Weather = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
      <div className="text-4xl">72°F</div>
      <div className="text-xl">Sunny</div>
    </div>
  );
};

const WeatherWithBoundary = withGameErrorBoundary(Weather);

export default WeatherWithBoundary;

export const displayWeather = () => {
  return <WeatherWithBoundary />;
};

