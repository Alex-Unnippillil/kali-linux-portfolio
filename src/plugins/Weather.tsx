"use client";

import React, { useState } from "react";

interface WeatherInfo {
  temperature: number;
  wind: number;
  humidity: number;
  forecast: { time: string; temperature: number }[];
}

interface Provider {
  id: string;
  name: string;
  attribution: string;
  fetchWeather: (lat: number, lon: number) => Promise<WeatherInfo>;
}

const providers: Provider[] = [
  {
    id: "metno",
    name: "MET Norway (met.no)",
    attribution:
      "Weather data from The Norwegian Meteorological Institute (https://api.met.no/).",
    fetchWeather: async (lat, lon) => {
      const res = await fetch(
        `https://api.met.no/weatherapi/locationforecast/2.0/compact?lat=${lat}&lon=${lon}`,
        {
          headers: {
            "User-Agent": "kali-linux-portfolio",
          },
        }
      );
      const json = await res.json();
      const ts = json.properties.timeseries;
      const current = ts[0].data.instant.details;
      const forecast = ts.slice(1, 5).map((t: any) => ({
        time: t.time,
        temperature: t.data.instant.details.air_temperature,
      }));
      return {
        temperature: current.air_temperature,
        wind: current.wind_speed,
        humidity: current.relative_humidity,
        forecast,
      };
    },
  },
  {
    id: "open-meteo",
    name: "Open-Meteo",
    attribution: "Weather data from Open-Meteo.com.",
    fetchWeather: async (lat, lon) => {
      const res = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&hourly=temperature_2m`
      );
      const json = await res.json();
      const forecast = json.hourly.time.slice(1, 5).map((time: string, i: number) => ({
        time,
        temperature: json.hourly.temperature_2m[i],
      }));
      return {
        temperature: json.current.temperature_2m,
        wind: json.current.wind_speed_10m,
        humidity: json.current.relative_humidity_2m,
        forecast,
      };
    },
  },
];

const Weather: React.FC = () => {
  const [query, setQuery] = useState("");
  const [provider, setProvider] = useState<Provider>(providers[0]!);
  const [location, setLocation] = useState<string>("");
  const [info, setInfo] = useState<WeatherInfo | null>(null);
  const [error, setError] = useState<string>("");

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setInfo(null);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(
          query
        )}`
      );
      const geo = await geoRes.json();
      if (!geo.results || !geo.results.length) {
        setError("Location not found");
        return;
      }
      const result = geo.results[0];
      setLocation(`${result.name}, ${result.country}`);
      const data = await provider.fetchWeather(result.latitude, result.longitude);
      setInfo(data);
    } catch {
      setError("Failed to fetch weather");
    }
  };

  const handleProviderChange = async (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const p = providers.find((pr) => pr.id === e.target.value) ?? providers[0]!;
    setProvider(p);
    // Refetch if we already have a location
    if (location) {
      try {
        const geoRes = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?count=1&name=${encodeURIComponent(
            location
          )}`
        );
        const geo = await geoRes.json();
        if (geo.results && geo.results.length) {
          const result = geo.results[0];
          const data = await p.fetchWeather(result.latitude, result.longitude);
          setInfo(data);
        }
      } catch {
        // ignore
      }
    }
  };

  return (
    <div className="p-4 max-w-md space-y-4">
      <form onSubmit={search} className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Enter location"
          aria-label="Search location"
          className="flex-1 border p-2 rounded"
        />
        <button type="submit" className="border px-4 rounded">
          Search
        </button>
      </form>

      <div>
        <label htmlFor="provider-select" className="mr-2">
          Provider:
        </label>
        <select
          id="provider-select"
          value={provider.id}
          onChange={handleProviderChange}
          className="border p-1 rounded"
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <p className="text-xs mt-1 text-gray-600">{provider.attribution}</p>
      </div>

      {error && <div className="text-red-500">{error}</div>}

      {info && (
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">{location}</h2>
          <div>Temperature: {info.temperature}°C</div>
          <div>Wind: {info.wind} m/s</div>
          <div>Humidity: {info.humidity}%</div>
          <div>
            <h3 className="font-medium">Forecast</h3>
            <ul className="list-disc ml-4">
              {info.forecast.map((f) => (
                <li key={f.time}>
                  {new Date(f.time).toLocaleString()}: {f.temperature}°C
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default Weather;

