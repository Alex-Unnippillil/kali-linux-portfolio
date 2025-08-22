import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import dynamic from 'next/dynamic';

const HourlyGraph = dynamic(() => import('./weather-hourly-graph'), { ssr: false });

const fetcher = (url) => fetch(url).then((res) => res.json());

const Weather = () => {
  const [coords, setCoords] = useState(null);
  const [cityInput, setCityInput] = useState('');
  const [city, setCity] = useState('');
  const [unit, setUnit] = useState('metric');
  const [needsCity, setNeedsCity] = useState(false);

  useEffect(() => {
    if (!navigator.geolocation) {
      setNeedsCity(true);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => setNeedsCity(true)
    );
  }, []);

  const params = new URLSearchParams();
  if (coords) {
    params.append('lat', coords.lat);
    params.append('lon', coords.lon);
  } else if (city) {
    params.append('city', city);
  }
  params.append('units', unit);

  const { data, error, isLoading } = useSWR(
    coords || city ? `/api/weather?${params.toString()}` : null,
    fetcher,
    { refreshInterval: 600000 }
  );

  const toggleUnit = () => setUnit((u) => (u === 'metric' ? 'imperial' : 'metric'));

  const handleCitySubmit = (e) => {
    e.preventDefault();
    setCity(cityInput);
  };

  if (needsCity && !city) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 gap-2">
        <form onSubmit={handleCitySubmit} className="flex gap-2 w-full">
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Enter city"
            className="flex-1 px-2 py-1 text-black"
          />
          <button type="submit" className="bg-ub-orange px-2 py-1">
            Search
          </button>
        </form>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 animate-pulse">
        <div className="h-8 w-20 bg-gray-500 mb-2" />
        <div className="h-4 w-32 bg-gray-500" />
      </div>
    );
  }

  if (error || !data) {
    return <div className="p-4 bg-ub-cool-grey text-white">Unable to load weather</div>;
  }

  const temp = Math.round(data.current.temp);
  const desc = data.current.weather?.[0]?.description;

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white p-4 overflow-y-auto">
      {data.alerts && data.alerts.length > 0 && (
        <div className="bg-red-600 text-white p-2 mb-2 text-sm">
          {data.alerts[0].event}: {data.alerts[0].description}
        </div>
      )}
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-4xl">{temp}°{unit === 'metric' ? 'C' : 'F'}</div>
          <div className="capitalize">{desc}</div>
        </div>
        <button onClick={toggleUnit} className="bg-ub-orange px-2 py-1">
          °C/°F
        </button>
      </div>
      {data.hourly && <HourlyGraph hourly={data.hourly} unit={unit} />}
    </div>
  );
};

export default Weather;

export const displayWeather = () => {
  return <Weather />;
};
