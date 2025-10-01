import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useUnitPreferences } from '../../hooks/useSettings';
import { getTemperatureUnit } from '../../utils/unitFormat';

const WeatherWidget = dynamic(() => import('../../apps/weather_widget'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

// Display stored unit preference and the browser's location consent status.
export default function WeatherWidgetPage() {
  const [locationConsent, setLocationConsent] = useState('unknown');
  const { measurementSystem, timeFormat } = useUnitPreferences();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Query geolocation permission state
    if (navigator?.permissions?.query) {
      navigator.permissions
        .query({ name: 'geolocation' })
        .then((res) => {
          setLocationConsent(res.state);
          res.onchange = () => setLocationConsent(res.state);
        })
        .catch(() => setLocationConsent('unknown'));
    }
  }, []);

  return (
    <div>
      <div className="mb-2 text-sm">
        Unit preference: {measurementSystem === 'imperial' ? 'Imperial' : 'Metric'} ({getTemperatureUnit(measurementSystem)})
      </div>
      <div className="mb-2 text-sm">
        Clock format: {timeFormat === '12h' ? '12-hour' : '24-hour'}
      </div>
      <div className="mb-4 text-sm">
        Location consent: {locationConsent}
      </div>
      <WeatherWidget />
    </div>
  );
}

