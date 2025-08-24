import React, { useEffect, useState } from 'react';
import useSWR from 'swr';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  });

const CACHE_KEY = 'weather-cache';
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes
const UNIT_KEY = 'weather-units';

interface Coords {
  lat: number;
  lon: number;
}

const Weather: React.FC = () => {
  const [coords, setCoords] = useState<Coords | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [units, setUnits] = useState<'metric' | 'imperial'>('metric');

  // Load persisted settings and attempt geolocation
  useEffect(() => {
    try {
      const storedUnits = localStorage.getItem(UNIT_KEY) as 'metric' | 'imperial' | null;
      if (storedUnits) setUnits(storedUnits);
    } catch (_) {
      // ignore
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          setCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        (err) => setGeoError(err.message)
      );
    } else {
      setGeoError('Geolocation not supported');
    }
  }, []);

  // Persist unit setting
  useEffect(() => {
    try {
      localStorage.setItem(UNIT_KEY, units);
    } catch (_) {
      // ignore
    }
  }, [units]);

  // Retrieve cached data for SWR fallback
  const fallback = (() => {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return undefined;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.timestamp < CACHE_DURATION) {
        return parsed.data;
      }
    } catch (_) {
      // ignore
    }
    return undefined;
  })();

  const { data, error, isLoading, mutate } = useSWR(
    coords ? `/api/weather?lat=${coords.lat}&lon=${coords.lon}&units=${units}` : null,
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: CACHE_DURATION,
      fallbackData: fallback,
      onSuccess: (data) => {
        try {
          localStorage.setItem(
            CACHE_KEY,
            JSON.stringify({ timestamp: Date.now(), data })
          );
        } catch (_) {
          // ignore
        }
      },
    }
  );

  const refresh = () => mutate();

  if (geoError) {
    return <div className="p-4 text-red-500">{geoError}</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">Failed to load weather data</div>;
  }

  if (isLoading || !data) {
    return <div className="p-4">Loading...</div>;
  }

  const unitSymbol = units === 'metric' ? '°C' : '°F';

  const hourlyChartData = {
    labels: data.hourly.time.slice(0, 24).map((t: string) => t.slice(11, 16)),
    datasets: [
      {
        label: `Temp (${unitSymbol})`,
        data: data.hourly.temperature_2m.slice(0, 24),
        borderColor: 'rgb(75, 192, 192)',
        fill: false,
      },
    ],
  };

  const dailyChartData = {
    labels: data.daily.time,
    datasets: [
      {
        label: `Max (${unitSymbol})`,
        data: data.daily.temperature_2m_max,
        backgroundColor: 'rgba(255, 99, 132, 0.5)',
      },
      {
        label: `Min (${unitSymbol})`,
        data: data.daily.temperature_2m_min,
        backgroundColor: 'rgba(53, 162, 235, 0.5)',
      },
    ],
  };

  return (
    <div className="h-full w-full bg-panel text-white p-4 overflow-auto space-y-4">
      <div className="flex items-center space-x-2">
        <select
          value={units}
          onChange={(e) => setUnits(e.target.value as 'metric' | 'imperial')}
          className="text-black px-1 py-1"
        >
          <option value="metric">Metric</option>
          <option value="imperial">Imperial</option>
        </select>
        <button
          type="button"
          onClick={refresh}
          className="px-2 py-1 bg-blue-600 rounded"
        >
          Refresh
        </button>
      </div>

      <div>
        Current temperature: {Math.round(data.current_weather.temperature)}
        {unitSymbol}
      </div>

      <div>
        <Line
          data={hourlyChartData}
          options={{ responsive: true, plugins: { legend: { display: false } } }}
        />
      </div>
      <div>
        <Bar data={dailyChartData} options={{ responsive: true }} />
      </div>
    </div>
  );
};

export default Weather;

export const displayWeather = () => <Weather />;

