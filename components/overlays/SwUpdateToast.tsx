import React, { useEffect, useState } from 'react';
import Toast from '../ui/Toast';

const SwUpdateToast: React.FC = () => {
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === 'SW_UPDATE') {
        navigator.serviceWorker.getRegistration().then((reg) => {
          if (reg && reg.waiting) {
            setWaitingWorker(reg.waiting);
          }
        });
      }
    };

    navigator.serviceWorker.addEventListener('message', handleMessage);
    return () => navigator.serviceWorker.removeEventListener('message', handleMessage);
  }, []);

  if (!waitingWorker) return null;

  const restart = () => {
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
    setWaitingWorker(null);
    window.location.reload();
  };

  return (
    <Toast message="Update available" actionLabel="Restart" onAction={restart} />
  );
};

export default SwUpdateToast;
