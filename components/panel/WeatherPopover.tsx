"use client";

import React, { useState } from "react";
import EmptyState from "../ui/EmptyState";

interface Props {
  location: string;
  unit: "metric" | "imperial";
  locations: string[];
  weather: {
    temperature: string;
    wind: string;
    pressure: string;
    humidity: string;
  };
  onLocationChange: (loc: string) => void;
  onUnitChange: (u: "metric" | "imperial") => void;
  onClose: () => void;
}

export default function WeatherPopover({
  location,
  unit,
  locations,
  weather,
  onLocationChange,
  onUnitChange,
  onClose,
}: Props) {
  const [query, setQuery] = useState("");

  const filtered = locations.filter((l) =>
    l.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="absolute mt-2 p-4 bg-gray-800 text-white rounded shadow-lg z-10 w-56">
      <div className="flex justify-between items-center mb-2">
        <span className="font-semibold text-sm">{location}</span>
        <button onClick={onClose} aria-label="Close" className="text-sm">
          ✕
        </button>
      </div>
      <div className="mb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search location"
          className="w-full mb-1 px-2 py-1 bg-gray-700 rounded text-sm"
        />
        {query && (
          <ul className="max-h-24 overflow-auto bg-gray-700 rounded">
            {filtered.map((loc) => (
              <li
                key={loc}
                className="px-2 py-1 cursor-pointer hover:bg-gray-600"
                onClick={() => {
                  onLocationChange(loc);
                  setQuery("");
                }}
              >
                {loc}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="p-4">
                <EmptyState
                  icon={<span>📍</span>}
                  headline="No results"
                  helperText="Try another location"
                />
              </li>
            )}
          </ul>
        )}
      </div>
      <div className="mb-2">
        <label className="mr-2 text-sm">Units:</label>
        <select
          value={unit}
          onChange={(e) => onUnitChange(e.target.value as "metric" | "imperial")}
          className="bg-gray-700 text-white px-2 py-1 rounded text-sm"
        >
          <option value="metric">Celsius</option>
          <option value="imperial">Fahrenheit</option>
        </select>
      </div>
      <div className="space-y-1 text-sm">
        <div>Temperature: {weather.temperature}</div>
        <div>Wind: {weather.wind}</div>
        <div>Pressure: {weather.pressure}</div>
        <div>Humidity: {weather.humidity}</div>
      </div>
    </div>
  );
}

