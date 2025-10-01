import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { withDeepLinkBoundary } from '../../utils/deeplink';

const WeatherWidget = dynamic(() => import('../../apps/weather_widget'), {
  ssr: false,
  loading: () => <p>Loading...</p>,
});

// Display stored unit preference and the browser's location consent status.
function WeatherWidgetPage() {
  const [unit, setUnit] = useState('metric');
  const [locationConsent, setLocationConsent] = useState('unknown');

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Load persisted unit preference if available
    try {
      const stored = localStorage.getItem('weatherUnit');
      if (stored) setUnit(stored);
    } catch {
      // ignore storage errors
    }

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
        Unit preference: {unit === 'imperial' ? 'Fahrenheit' : 'Celsius'}
      </div>
      <div className="mb-4 text-sm">
        Location consent: {locationConsent}
      </div>
      <WeatherWidget />
    </div>
  );
}

export default withDeepLinkBoundary('weather_widget', WeatherWidgetPage);
