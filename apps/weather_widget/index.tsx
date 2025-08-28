'use client';
import { useEffect } from 'react';

export default function WeatherWidget() {
  useEffect(() => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = '/apps/weather_widget/styles.css';
    document.head.appendChild(link);

    if (typeof window !== 'undefined') {
      import('./main');
    }
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <div>
      <div className="controls">
        <select id="city-picker"></select>
        <select id="unit-toggle">
          <option value="metric">°C</option>
          <option value="imperial">°F</option>
        </select>
        <input type="text" id="api-key-input" placeholder="API Key (optional)" />
        <button id="save-api-key">Save</button>
      </div>
      <div id="weather" className="weather">
        <div className="temp">--°C</div>
        <img className="icon" src="" alt="Weather icon" />
        <div className="forecast">Loading...</div>
      </div>
    </div>
  );
}

