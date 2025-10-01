'use client';
import { useEffect } from 'react';

export default function WeatherWidget() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      import('./main');
    }
  }, []);

  return (
    <div className="widget-container">
      <div className="controls">
        <input
          type="text"
          id="city-search"
          placeholder="Search city"
          list="saved-cities"
          aria-label="Search city"
        />
        <datalist id="saved-cities" aria-label="Saved city suggestions"></datalist>
        <select id="unit-toggle" aria-label="Temperature units">
          <option value="metric">°C</option>
          <option value="imperial">°F</option>
        </select>
        <input
          type="password"
          id="api-passphrase"
          placeholder="Passphrase"
          aria-label="Encryption passphrase"
        />
        <button id="unlock-api-key">Unlock</button>
        <input
          type="password"
          id="new-api-passphrase"
          placeholder="New passphrase"
          aria-label="New encryption passphrase"
        />
        <button id="rotate-api-passphrase">Rotate</button>
        <input
          type="text"
          id="api-key-input"
          placeholder="API Key (optional)"
          aria-label="OpenWeather API key"
        />
        <button id="save-api-key">Save</button>
        <button id="pin-city">Pin</button>
      </div>
      <p id="secure-store-info" className="secure-note info"></p>
      <p id="secure-store-status" className="secure-note info"></p>
      <div id="error-message"></div>
      <div id="weather" className="weather">
        <div className="temp">--°C</div>
        <div className="feels-like">Feels like --°C</div>
        <img className="icon" src="" alt="Weather icon" />
        <div className="forecast">Loading...</div>
        <div className="daily"></div>
        <div className="sunrise">Sunrise: --</div>
        <div className="sunset">Sunset: --</div>
      </div>
    </div>
  );
}

