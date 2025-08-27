import React, { useEffect, useState } from 'react';

const demoForecast = () => {
  const now = new Date();
  const day = (n) => {
    const d = new Date(now);
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };
  return {
    current_weather: { temperature: 21, weathercode: 0 },
    daily: {
      time: [day(0), day(1), day(2)],
      temperature_2m_max: [24, 23, 22],
      temperature_2m_min: [16, 15, 14],
      weathercode: [0, 1, 2],
    },
  };
};

const codeToIcon = (code) => {
  if ([0].includes(code)) return 'sunny';
  if ([1, 2, 3, 45, 48].includes(code)) return 'cloudy';
  return 'rain';
};

const Weather = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    const load = async () => {
      if (!navigator.geolocation) {
        setData(demoForecast());
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const { latitude, longitude } = pos.coords;
            const url =
              `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`;
            const res = await fetch(url);
            if (!res.ok) throw new Error('Failed to fetch forecast');
            const json = await res.json();
            setData(json);
          } catch {
            setData(demoForecast());
          }
        },
        () => setData(demoForecast())
      );
    };
    load();
  }, []);

  if (!data) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );
  }

  const formatDate = (str) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(str));

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white p-4 overflow-auto">
      <div className="mb-4 flex flex-col items-center">
        <div className={`weather-icon weather-${codeToIcon(data.current_weather.weathercode)} mb-2`} />
        <div className="text-4xl">
          {Math.round(data.current_weather.temperature)}°C
        </div>
      </div>
      <ul className="text-sm w-full max-w-xs space-y-1">
        {data.daily.time.map((t, i) => (
          <li key={t} className="flex justify-between items-center">
            <span className="flex items-center space-x-2">
              <span>{formatDate(t)}</span>
              <span className={`weather-icon weather-${codeToIcon(data.daily.weathercode[i])}`} />
            </span>
            <span>
              {Math.round(data.daily.temperature_2m_max[i])}/
              {Math.round(data.daily.temperature_2m_min[i])}°C
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Weather;

export const displayWeather = () => {
  return <Weather />;
};

