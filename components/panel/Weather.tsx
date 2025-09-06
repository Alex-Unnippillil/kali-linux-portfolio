"use client";

import React, { useState, useEffect } from "react";
import WeatherPopover from "./WeatherPopover";
import WeatherIcon from "@/apps/weather/components/WeatherIcon";

const WEATHER_PREFIX = "xfce.weather.";

type Unit = "metric" | "imperial";

const MOCK_DATA: Record<string, {
  code: number;
  tempC: number;
  tempF: number;
  windKph: number;
  windMph: number;
  pressure: number;
  humidity: number;
}> = {
  "New York": { code: 0, tempC: 22, tempF: 72, windKph: 15, windMph: 9, pressure: 1012, humidity: 55 },
  London: { code: 0, tempC: 18, tempF: 64, windKph: 12, windMph: 7, pressure: 1005, humidity: 70 },
  Tokyo: { code: 0, tempC: 25, tempF: 77, windKph: 20, windMph: 12, pressure: 1018, humidity: 60 },
};

export default function Weather() {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useState(() => {
    if (typeof window === "undefined") return "New York";
    return localStorage.getItem(`${WEATHER_PREFIX}location`) || "New York";
  });
  const [unit, setUnit] = useState<Unit>(() => {
    if (typeof window === "undefined") return "metric";
    return (localStorage.getItem(`${WEATHER_PREFIX}unit`) as Unit) || "metric";
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`${WEATHER_PREFIX}location`, location);
    }
  }, [location]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(`${WEATHER_PREFIX}unit`, unit);
    }
  }, [unit]);

  const data = MOCK_DATA[location];
  const temperature = unit === "metric" ? `${data.tempC}°C` : `${data.tempF}°F`;
  const wind = unit === "metric" ? `${data.windKph} km/h` : `${data.windMph} mph`;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center space-x-1 text-white"
        aria-label="Weather"
      >
        <WeatherIcon code={data.code} className="w-4 h-4" />
        <span className="text-sm">{temperature}</span>
      </button>
      {open && (
        <WeatherPopover
          location={location}
          unit={unit}
          weather={{
            temperature,
            wind,
            pressure: `${data.pressure} hPa`,
            humidity: `${data.humidity}%`,
          }}
          locations={Object.keys(MOCK_DATA)}
          onLocationChange={(loc) => {
            if (MOCK_DATA[loc]) setLocation(loc);
          }}
          onUnitChange={setUnit}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}

