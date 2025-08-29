import React from 'react';

interface MapOverlayProps {
  lat: number;
  lon: number;
  code: number;
}

const tileUrl = (lat: number, lon: number, zoom = 5) => {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom));
  const y = Math.floor(
    ((1 -
      Math.log(Math.tan((lat * Math.PI) / 180) +
        1 / Math.cos((lat * Math.PI) / 180)) /
        Math.PI) /
      2) *
      Math.pow(2, zoom),
  );
  return `https://tile.openstreetmap.org/${zoom}/${x}/${y}.png`;
};

const conditionIcon = (code: number) => {
  if ([0].includes(code)) return '☀️';
  if ([1, 2, 3].includes(code)) return '☁️';
  if ([51, 53, 55, 61, 63, 65, 80, 81, 82].includes(code)) return '🌧️';
  if ([71, 73, 75, 77, 85, 86].includes(code)) return '❄️';
  if ([95, 96, 99].includes(code)) return '⛈️';
  return '☀️';
};

const MapOverlay: React.FC<MapOverlayProps> = ({ lat, lon, code }) => {
  const url = tileUrl(lat, lon);
  const icon = conditionIcon(code);
  return (
    <div className="relative w-64 h-64 mt-4">
      <img src={url} alt="Map tile" className="w-full h-full" />
      <div className="absolute inset-0 flex items-center justify-center text-4xl">
        <span role="img" aria-label="current weather icon">
          {icon}
        </span>
      </div>
      <div className="absolute bottom-1 left-1 bg-white/70 text-[10px] px-1 rounded">
        Weather data © Open-Meteo · Map data © OpenStreetMap contributors
      </div>
    </div>
  );
};

export default MapOverlay;

