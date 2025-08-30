import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { patchLeafletDefaultIcon } from './fixLeafletIcons';

export default function Map() {
  const center: [number, number] = [51.505, -0.09];

  useEffect(() => {
    patchLeafletDefaultIcon();
  }, []);

  return (
    <div style={{ height: 400, width: '100%' }}>
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <Marker position={center}>
          <Popup>Hello from Leaflet.</Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
