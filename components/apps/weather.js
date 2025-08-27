import React, { useEffect, useState, useRef } from 'react';
import { DEFAULT_LOCATION, getForecast } from '../../lib/weather';

const SunIcon = ({ still }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (still) return;
    let angle = 0;
    let frame;
    const animate = () => {
      angle = (angle + 0.5) % 360;
      if (ref.current) ref.current.style.transform = `rotate(${angle}deg)`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [still]);
  return (
    <svg
      ref={ref}
      className="w-16 h-16 mb-4"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      aria-hidden="true"
    >
      <circle cx="32" cy="32" r="12" />
      {[...Array(8)].map((_, i) => {
        const angle = (i * Math.PI) / 4;
        const x1 = 32 + Math.cos(angle) * 20;
        const y1 = 32 + Math.sin(angle) * 20;
        const x2 = 32 + Math.cos(angle) * 28;
        const y2 = 32 + Math.sin(angle) * 28;
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
      })}
    </svg>
  );
};

const CloudIcon = ({ still }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (still) return;
    let x = 0;
    let dir = 1;
    let frame;
    const animate = () => {
      x += dir * 0.3;
      if (x > 5 || x < -5) dir *= -1;
      if (ref.current) ref.current.style.transform = `translateX(${x}px)`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [still]);
  return (
    <svg
      ref={ref}
      className="w-16 h-16 mb-4"
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20 46h28a10 10 0 0 0 0-20 14 14 0 0 0-26-6 12 12 0 0 0-2 26z" />
    </svg>
  );
};

const RainIcon = ({ still }) => {
  const groupRef = useRef(null);
  useEffect(() => {
    if (still) return;
    let y = 0;
    let frame;
    const animate = () => {
      y = (y + 1) % 16;
      if (groupRef.current) groupRef.current.style.transform = `translateY(${y}px)`;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [still]);
  return (
    <svg
      className="w-16 h-16 mb-4"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="4"
      aria-hidden="true"
    >
      <path d="M20 40h24a8 8 0 0 0 0-16 12 12 0 0 0-22-4 10 10 0 0 0-2 20z" />
      <g ref={groupRef}>
        {[12, 24, 36].map((x) => (
          <line key={x} x1={x} y1="44" x2={x - 2} y2="52" />
        ))}
      </g>
    </svg>
  );
};

const conditionMap = [
  {
    codes: [0],
    gradient: 'bg-gradient-to-b from-blue-500 to-blue-700',
    Icon: SunIcon,
  },
  {
    codes: [1, 2, 3],
    gradient: 'bg-gradient-to-b from-gray-500 to-gray-700',
    Icon: CloudIcon,
  },
  {
    codes: [51, 53, 55, 61, 63, 65, 80, 81, 82],
    gradient: 'bg-gradient-to-b from-indigo-700 to-gray-900',
    Icon: RainIcon,
  },
];

const getCondition = (code) =>
  conditionMap.find((c) => c.codes.includes(code)) || conditionMap[0];

const Weather = () => {
  const [data, setData] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [unit, setUnit] = useState('metric');

  useEffect(() => {
    const load = async () => {
      try {
        const position = await new Promise((resolve, reject) => {
          if (!navigator.geolocation) return reject();
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });
        const { latitude, longitude } = position.coords;
        const json = await getForecast({ latitude, longitude });
        setData(json);
      } catch {
        const json = await getForecast(DEFAULT_LOCATION);
        setData(json);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduceMotion(e.matches);
    setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toUnit = (c) =>
    unit === 'metric' ? c : c * (9 / 5) + 32;

  const formatDate = (str) =>
    new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(new Date(str));

  const formatTime = (str) =>
    new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: 'numeric',
    }).format(new Date(str));

  if (!data) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center bg-ub-cool-grey text-white">
        Loading...
      </div>
    );
  }

  const { gradient, Icon } = getCondition(data.current_weather.weathercode);
  const hourlyHours = data.hourly.time.slice(0, 24);
  const hourlyTemps = data.hourly.temperature_2m.slice(0, 24);
  const hourlyPrecip = data.hourly.precipitation_probability.slice(0, 24);
  const maxTemp = Math.max(...hourlyTemps);
  const minTemp = Math.min(...hourlyTemps);
  const points = hourlyTemps
    .map((t, i) => {
      const x = (i / (hourlyTemps.length - 1)) * 100;
      const y = 100 - ((t - minTemp) / (maxTemp - minTemp)) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div
      className={`h-full w-full flex flex-col items-center text-white p-4 overflow-auto ${gradient}`}
      aria-live="polite"
    >
      <Icon still={reduceMotion} />
      <div className="text-4xl mb-2">
        {Math.round(toUnit(data.current_weather.temperature))}°
        {unit === 'metric' ? 'C' : 'F'}
      </div>
      <button
        className="mb-4 px-2 py-1 bg-black/20 rounded"
        onClick={() => setUnit(unit === 'metric' ? 'imperial' : 'metric')}
      >
        Switch to {unit === 'metric' ? '°F' : '°C'}
      </button>
      <div className="text-sm mb-4">
        Sunrise: {formatTime(data.daily.sunrise[0])} | Sunset:{' '}
        {formatTime(data.daily.sunset[0])}
      </div>
      <svg viewBox="0 0 100 100" className="w-full max-w-md h-24 mb-4">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      <ul className="text-xs w-full max-w-md grid grid-cols-2 gap-2 mb-4">
        {hourlyHours.map((t, i) => (
          <li key={t} className="flex justify-between">
            <span>{formatTime(t)}</span>
            <span>
              {Math.round(toUnit(hourlyTemps[i]))}° / {hourlyPrecip[i]}%
            </span>
          </li>
        ))}
      </ul>
      <div className="text-lg mb-2">Daily Forecast</div>
      <div className="grid grid-cols-2 gap-2 w-full max-w-md mb-4">
        {data.daily.time.map((t, i) => (
          <div key={t} className="bg-black/20 p-2 rounded text-center">
            <div className="text-sm">{formatDate(t)}</div>
            <div className="text-lg">
              {Math.round(toUnit(data.daily.temperature_2m_max[i]))}/
              {Math.round(toUnit(data.daily.temperature_2m_min[i]))}°
            </div>
            <div className="text-xs">{data.daily.precipitation_probability_max[i]}%</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Weather;

export const displayWeather = () => {
  return <Weather />;
};
