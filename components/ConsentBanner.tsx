import React, { useEffect, useState } from 'react';

interface ConsentBannerProps {
  onConsent: (granted: boolean) => void;
}

const ConsentBanner: React.FC<ConsentBannerProps> = ({ onConsent }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('analytics-consent');
      setVisible(!stored);
    }
  }, []);

  const handle = (granted: boolean) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('analytics-consent', granted ? 'granted' : 'denied');
    }
    setVisible(false);
    onConsent(granted);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 text-white p-4 flex justify-between items-center text-sm">
      <span>Allow anonymous analytics?</span>
      <div className="space-x-2">
        <button
          className="px-3 py-1 rounded bg-blue-600"
          onClick={() => handle(true)}
        >
          Allow
        </button>
        <button
          className="px-3 py-1 rounded bg-gray-600"
          onClick={() => handle(false)}
        >
          Decline
        </button>
      </div>
    </div>
  );
};

export default ConsentBanner;
