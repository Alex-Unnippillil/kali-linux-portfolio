import { useEffect, useState } from 'react';

export default function OfflineRibbon() {
  const [online, setOnline] = useState(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const updateStatus = () => {
      setOnline(navigator.onLine);
      setDismissed(false);
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);

    return () => {
      window.removeEventListener('online', updateStatus);
      window.removeEventListener('offline', updateStatus);
    };
  }, []);

  if (online || dismissed) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-50 flex items-center justify-center bg-red-600 p-2 text-sm text-white"
    >
      <span>You're offline. Some features may be unavailable.</span>
      <button
        type="button"
        aria-label="Dismiss offline notification"
        className="ml-4 underline"
        onClick={() => setDismissed(true)}
      >
        Dismiss
      </button>
    </div>
  );
}

