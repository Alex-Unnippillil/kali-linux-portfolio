"use client";

import { useEffect, useState } from "react";

type WeatherData = {
  temp: number;
};

function mockFetchWeather(): Promise<WeatherData> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (Math.random() < 0.5) {
        reject(new Error("Weather provider unavailable"));
      } else {
        resolve({ temp: 72 });
      }
    }, 500);
  });
}

export default function Weather() {
  const [open, setOpen] = useState(false);
  const [data, setData] = useState<WeatherData | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await mockFetchWeather();
      setData(result);
    } catch {
      setError(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const icon = error ? "⚠️" : "☀️";

  return (
    <div className="relative">
      <button
        aria-label="Weather"
        onClick={() => setOpen((o) => !o)}
        className="px-2"
      >
        <span className={error ? "text-red-500" : ""}>{icon}</span>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-48 rounded bg-ub-cool-grey p-2 text-white">
          {loading && <p>Loading...</p>}
          {!loading && error && (
            <div className="space-y-2 text-center">
              <p className="text-sm">Unable to load weather data.</p>
              <button
                onClick={load}
                className="rounded bg-ubt-grey px-2 py-1 text-xs text-white"
              >
                Retry
              </button>
            </div>
          )}
          {!loading && !error && data && (
            <p className="text-sm">Temperature: {data.temp}°</p>
          )}
        </div>
      )}
    </div>
  );
}

