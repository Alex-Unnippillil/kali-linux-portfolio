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
    <div className="widget-container">
      <div className="controls">
        <input type="text" id="city-search" placeholder="Search city" />
        <select id="unit-toggle">
          <option value="metric">°C</option>
          <option value="imperial">°F</option>
        </select>
        <input type="text" id="api-key-input" placeholder="API Key (optional)" />
        <button id="save-api-key">Save</button>
      </div>
      <div id="error-message"></div>
      <div id="weather" className="weather">
        <div className="temp">--°C</div>
        <img className="icon" src="" alt="Weather icon" />
        <div className="forecast">Loading...</div>
        <div className="sunrise">Sunrise: --</div>
        <div className="sunset">Sunset: --</div>
      </div>
    </div>
  );
}

