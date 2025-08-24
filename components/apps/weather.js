import React, { useState, useEffect } from 'react';
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

const fetcher = (url) =>
  fetch(url).then((res) => {
    if (!res.ok) throw new Error('Request failed');
    return res.json();
  });

const Weather = () => {
  const [query, setQuery] = useState('');
  const [locations, setLocations] = useState([]);
  const [selected, setSelected] = useState(null);
  const [units, setUnits] = useState('metric');
  const [geoError, setGeoError] = useState(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('weather-locations');
      if (stored) {
        const parsed = JSON.parse(stored);
        setLocations(parsed);
        if (parsed.length) setSelected(parsed[0]);
      }
    } catch (_) {
      // ignore
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('weather-locations', JSON.stringify(locations));
    } catch (_) {
      // ignore
    }
  }, [locations]);

  const { data, error, isLoading } = useSWR(
    selected ? `/api/weather?lat=${selected.lat}&lon=${selected.lon}&units=${units}` : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 10 * 60 * 1000 }
  );

  const search = async (e) => {
    e.preventDefault();
    if (!query) return;
    setGeoError(null);
    try {
      const res = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1`
      );
      if (!res.ok) throw new Error('Location lookup failed');
      const geo = await res.json();
      if (!geo.results || !geo.results.length) throw new Error('Location not found');
      const loc = {
        name: geo.results[0].name,
        lat: geo.results[0].latitude,
        lon: geo.results[0].longitude,
      };
      setSelected(loc);
    } catch (err) {
      setGeoError(err.message);
    }
  };

  const saveLocation = () => {
    if (!selected) return;
    if (!locations.find((l) => l.name === selected.name)) {
      setLocations([...locations, selected]);
    }
  };

  const removeLocation = (name) => {
    setLocations(locations.filter((l) => l.name !== name));
    if (selected && selected.name === name) setSelected(null);
  };

  const hourlyChartData = data
    ? {
        labels: data.hourly.time.slice(0, 24).map((t) => t.slice(11, 16)),
        datasets: [
          {
            label: `Temp (${units === 'metric' ? '°C' : '°F'})`,
            data: data.hourly.temperature_2m.slice(0, 24),
            borderColor: 'rgb(75, 192, 192)',
            fill: false,
          },
        ],
      }
    : null;

  const dailyChartData = data
    ? {
        labels: data.daily.time,
        datasets: [
          {
            label: `Max (${units === 'metric' ? '°C' : '°F'})`,
            data: data.daily.temperature_2m_max,
            backgroundColor: 'rgba(255, 99, 132, 0.5)',
          },
          {
            label: `Min (${units === 'metric' ? '°C' : '°F'})`,
            data: data.daily.temperature_2m_min,
            backgroundColor: 'rgba(53, 162, 235, 0.5)',
          },
        ],
      }
    : null;

  return (
    <div className="h-full w-full bg-panel text-white p-4 overflow-auto">
      <form onSubmit={search} className="flex space-x-2 mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search city"
          className="text-black px-2 py-1 flex-1"
        />
        <button type="submit" className="px-3 py-1 bg-blue-600 rounded">
          Lookup
        </button>
        <select
          value={units}
          onChange={(e) => setUnits(e.target.value)}
          className="text-black px-1 py-1"
        >
          <option value="metric">Metric</option>
          <option value="imperial">Imperial</option>
        </select>
        {selected && (
          <button
            type="button"
            onClick={saveLocation}
            className="px-2 py-1 bg-green-600 rounded"
          >
            Save
          </button>
        )}
      </form>

      {geoError && <div className="text-red-500 mb-2">{geoError}</div>}

      {locations.length > 0 && (
        <div className="flex items-center space-x-2 mb-4">
          <span>Saved:</span>
          <select
            value={selected ? selected.name : ''}
            onChange={(e) =>
              setSelected(locations.find((l) => l.name === e.target.value) || null)
            }
            className="text-black px-1 py-1"
          >
            <option value="" disabled>
              Select location
            </option>
            {locations.map((l) => (
              <option key={l.name} value={l.name}>
                {l.name}
              </option>
            ))}
          </select>
          {selected && (
            <button
              type="button"
              onClick={() => removeLocation(selected.name)}
              className="px-2 py-1 bg-red-600 rounded"
            >
              Remove
            </button>
          )}
        </div>
      )}

      {error && <div className="text-red-500">Failed to load weather data</div>}
      {isLoading && <div>Loading...</div>}
      {data && (
        <div className="space-y-8">
          <div>
            <Line
              data={hourlyChartData}
              options={{
                responsive: true,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
          <div>
            <Bar data={dailyChartData} options={{ responsive: true }} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Weather;

export const displayWeather = () => {
  return <Weather />;
};
