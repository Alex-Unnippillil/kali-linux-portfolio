'use client';
import { useEffect } from 'react';
import './styles.css';

export default function WeatherWidget() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('./main');
    }
  }, []);

  return (
    <div>
      <div className="controls">
        <select id="city-picker"></select>
        <select id="unit-toggle">
          <option value="metric">°C</option>
          <option value="imperial">°F</option>
        </select>
        <input
          type="text"
          id="api-key-input"
          placeholder="OpenWeather API Key"
          title="OpenWeather API key required for live data"
        />
        <button id="save-api-key">Save</button>
      </div>
      <small className="api-note">
        Requires an{' '}
        <a
          href="https://openweathermap.org/appid"
          target="_blank"
          rel="noopener noreferrer"
        >
          OpenWeather API key
        </a>
        . Leave blank to use demo data.
      </small>
      <div id="demo-message" className="demo-message" style={{ display: 'none' }}>
        Showing demo weather data. Add an API key for live updates.
      </div>
      <div id="weather" className="weather">
        <div className="temp">--°C</div>
        <img className="icon" src="" alt="Weather icon" />
        <div className="forecast">Loading...</div>
      </div>
    </div>
  );
}

