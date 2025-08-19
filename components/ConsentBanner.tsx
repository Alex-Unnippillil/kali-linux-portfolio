import { useEffect, useState } from 'react';
import { setAnalyticsConsent, trackPageview } from '../lib/analytics';

const STORAGE_KEY = 'ga-consent';

export default function ConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null;
    if (stored === 'granted') {
      setAnalyticsConsent(true);
      trackPageview(window.location.pathname);
    } else if (stored !== 'denied') {
      setVisible(true);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(STORAGE_KEY, 'granted');
    setAnalyticsConsent(true);
    trackPageview(window.location.pathname);
    setVisible(false);
  };

  const decline = () => {
    localStorage.setItem(STORAGE_KEY, 'denied');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-800 text-white p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between z-50">
      <p className="text-sm mb-2 sm:mb-0">We use cookies for analytics. Do you accept?</p>
      <div className="flex space-x-2">
        <button className="px-3 py-1 bg-blue-600 rounded" onClick={accept}>Accept</button>
        <button className="px-3 py-1 bg-gray-600 rounded" onClick={decline}>Decline</button>
      </div>
    </div>
  );
}

