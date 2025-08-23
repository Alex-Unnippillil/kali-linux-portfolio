import React from 'react';

const Weather = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-panel text-white">
      <div className="text-4xl">72°F</div>
      <div className="text-xl">Sunny</div>
    </div>
  );
};

export default Weather;

export const displayWeather = () => {
  return <Weather />;
};

