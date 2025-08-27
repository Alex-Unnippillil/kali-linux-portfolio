import React, { useEffect, useRef, useState } from 'react';

const defaultLocation = {
  latitude: 40.7128,
  longitude: -74.0060,
};

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
      if (groupRef.current)
        groupRef.current.style.transform = `translateY(${y}px)`;
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

const SnowIcon = ({ still }) => {
  const groupRef = useRef(null);
  useEffect(() => {
    if (still) return;
    let y = 0;
    let frame;
    const animate = () => {
      y = (y + 0.5) % 16;
      if (groupRef.current)
        groupRef.current.style.transform = `translateY(${y}px)`;
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
      <g ref={groupRef} fill="currentColor" stroke="none">
        {[12, 24, 36].map((x) => (
          <circle key={x} cx={x} cy="46" r="2" />
        ))}
      </g>
    </svg>
  );
};

const ThunderIcon = ({ still }) => {
  const boltRef = useRef(null);
  useEffect(() => {
    if (still) return;
    let opacity = 1;
    let dir = -0.05;
    let frame;
    const animate = () => {
      opacity += dir;
      if (opacity <= 0.2 || opacity >= 1) dir *= -1;
      if (boltRef.current) boltRef.current.style.opacity = opacity;
      frame = requestAnimationFrame(animate);
    };
    frame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame);
  }, [still]);
  return (
    <svg
      className="w-16 h-16 mb-4"
      viewBox="0 0 64 64"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20 46h28a10 10 0 0 0 0-20 14 14 0 0 0-26-6 12 12 0 0 0-2 26z" />
      <path
        ref={boltRef}
        d="M32 36l6 0-6 10h6l-10 12 4-10h-6z"
      />
    </svg>
  );
};

const conditionMap = [
  {
    codes: [0],
    gradient: 'bg-gradient-to-b from-blue-500 to-blue-700',
    Icon: SunIcon,
    label: 'Clear sky',
  },
  {
    codes: [1, 2, 3],
    gradient: 'bg-gradient-to-b from-gray-500 to-gray-700',
    Icon: CloudIcon,
    label: 'Cloudy',
  },
  {
    codes: [51, 53, 55, 61, 63, 65, 80, 81, 82],
    gradient: 'bg-gradient-to-b from-indigo-700 to-gray-900',
    Icon: RainIcon,
    label: 'Rain',
  },
  {
    codes: [71, 73, 75, 77, 85, 86],
    gradient: 'bg-gradient-to-b from-sky-600 to-sky-800',
    Icon: SnowIcon,
    label: 'Snow',
  },
  {
    codes: [95, 96, 99],
    gradient: 'bg-gradient-to-b from-gray-700 to-gray-900',
    Icon: ThunderIcon,
    label: 'Thunderstorm',
  },
];

const getCondition = (code) =>
  conditionMap.find((c) => c.codes.includes(code)) || conditionMap[0];

const Weather = () => {
  const [data, setData] = useState(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [locationDenied, setLocationDenied] = useState(false);
  const [city, setCity] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);
  const [points, setPoints] = useState('');
  const pointsWorkerRef = useRef(null);
  const chartRef = useRef(null);
  const timesRef = useRef(null);
  const fetchForecast = async (lat, lon, cityName) => {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m&daily=weathercode,temperature_2m_max,temperature_2m_min&current_weather=true&timezone=auto`;
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch forecast');
      const json = await res.json();
      setData(json);
      setLastUpdated(new Date());
      setAnnouncement(`Weather updated${cityName ? ' for ' + cityName : ''}`);
    } catch {
      try {
        const cached = await caches.match(url);
        if (cached) {
          const json = await cached.json();
          setData(json);
          setLastUpdated(new Date());
          setAnnouncement('Weather loaded from cache');
        }
      } catch {
        // ignore
      }
    }
  };

  // S1: Geolocation fallback with optional manual city entry
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocationDenied(true);
      fetchForecast(defaultLocation.latitude, defaultLocation.longitude);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        fetchForecast(latitude, longitude);
      },
      () => {
        setLocationDenied(true);
        fetchForecast(defaultLocation.latitude, defaultLocation.longitude);
      }
    );
  }, []);

  // S2: Respect reduced motion preference
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e) => setReduceMotion(e.matches);
    setReduceMotion(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // S3: Offload polyline generation to worker only when needed
  useEffect(() => {
    pointsWorkerRef.current = new Worker(
      new URL('./weather.worker.js', import.meta.url)
    );
    pointsWorkerRef.current.onmessage = (e) => setPoints(e.data);
    return () => pointsWorkerRef.current.terminate();
  }, []);

  useEffect(() => {
    if (!data || !pointsWorkerRef.current) return;
    pointsWorkerRef.current.postMessage({
      temps: data.hourly.temperature_2m.slice(0, 24),
    });
  }, [data]);

  // S4: Announce updates via hidden live region
  useEffect(() => {
    if (lastUpdated) {
      setAnnouncement(
        `Weather updated at ${lastUpdated.toLocaleTimeString()}`
      );
    }
  }, [lastUpdated]);

  // S5: Synchronize scrolling between chart and time labels
  useEffect(() => {
    const c = chartRef.current;
    const t = timesRef.current;
    if (!c || !t) return;
    const sync = (source, target) => {
      target.scrollLeft = source.scrollLeft;
    };
    const onC = () => sync(c, t);
    const onT = () => sync(t, c);
    c.addEventListener('scroll', onC);
    t.addEventListener('scroll', onT);
    return () => {
      c.removeEventListener('scroll', onC);
      t.removeEventListener('scroll', onT);
    };
  }, []);

  const handleCitySubmit = async (e) => {
    e.preventDefault();
    if (!city.trim()) return;
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          city.trim()
        )}`
      );
      const json = await res.json();
      const result = json.results && json.results[0];
      if (result) {
        const name = result.name;
        fetchForecast(result.latitude, result.longitude, name);
      } else {
        setAnnouncement('City not found');
      }
    } catch {
      setAnnouncement('City lookup failed');
    }
  };

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

  const { gradient, Icon, label } = getCondition(
    data.current_weather.weathercode
  );
  const hourlyTimes = data.hourly.time.slice(0, 24);

  return (
    <div
      className={`h-full w-full flex flex-col items-center justify-start text-white p-4 overflow-auto ${gradient}`}
    >
      <Icon still={reduceMotion} />
      {locationDenied && (
        <form
          onSubmit={handleCitySubmit}
          className="mb-4 w-full max-w-md flex"
          aria-label="Manual city entry"
        >
          <input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            className="flex-1 p-2 rounded-l text-black"
            placeholder="Enter city"
            aria-label="City"
          />
          <button type="submit" className="bg-white/20 px-4 rounded-r">
            Go
          </button>
        </form>
      )}
      <div className="mb-2">{label}</div>
      <div className="text-4xl mb-4">
        {Math.round(data.current_weather.temperature)}°C
      </div>
      {/* S7: ARIA-labelled forecast sections */}
      <div
        className="grid grid-cols-3 gap-2 w-full max-w-md mb-4 text-sm"
        aria-label="7-day forecast"
      >
        {data.daily.time.map((t, i) => {
          const { Icon: DayIcon } = getCondition(
            data.daily.weathercode[i]
          );
          return (
            <div
              key={t}
              className="bg-white/10 rounded p-2 flex flex-col items-center"
            >
              <span>{formatDate(t)}</span>
              <DayIcon still={reduceMotion} />
              <span>
                {Math.round(data.daily.temperature_2m_max[i])}/
                {Math.round(data.daily.temperature_2m_min[i])}°C
              </span>
            </div>
          );
        })}
      </div>
      {/* S6: Accessible hourly temperature chart */}
      <div
        ref={chartRef}
        className="w-full max-w-md h-32 overflow-x-auto"
      >
        <svg
          viewBox="0 0 100 50"
          role="img"
          aria-label="Hourly temperature trend"
          className="w-full h-full"
        >
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            points={points}
          />
        </svg>
      </div>
      <div
        ref={timesRef}
        className="flex justify-between w-full max-w-md text-xs mt-2 overflow-x-auto"
      >
        {hourlyTimes.map((t) => (
          <span key={t} className="flex-1 text-center">
            {new Date(t).getHours()}
          </span>
        ))}
      </div>
      {lastUpdated && (
        <div className="text-xs mt-4">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </div>
      )}
      {/* S8: Hidden live region for assistive tech announcements */}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
};

export default Weather;

export const displayWeather = () => {
  return <Weather />;
};

