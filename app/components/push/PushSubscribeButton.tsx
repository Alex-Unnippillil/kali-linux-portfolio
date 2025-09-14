'use client';

import { useCallback, useState } from 'react';

const PushSubscribeButton = () => {
  const [subscribed, setSubscribed] = useState(false);

  const subscribe = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') return;
      const registration = await navigator.serviceWorker.ready;
      await registration.pushManager.subscribe({ userVisibleOnly: true });
      setSubscribed(true);
    } catch (err) {
      console.error('Push subscription failed', err);
    }
  }, []);

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={subscribe}
      disabled={subscribed}
      className="px-2 py-1 border rounded"
    >
      {subscribed ? 'Subscribed' : 'Enable Push'}
    </button>
  );
};

export default PushSubscribeButton;
