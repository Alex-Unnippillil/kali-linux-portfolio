"use client";

import { useState } from 'react';

// Helper to convert a base64 URL-safe string to a Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

const PushSubscribeButton: React.FC = () => {
  const [status, setStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
  const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;

  if (!vapidPublicKey) return null;

  const handleSubscribe = async () => {
    setStatus('loading');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(subscription),
      });

      if (!res.ok) throw new Error('Failed to store subscription');

      setStatus('success');
    } catch (err) {
      console.error(err);
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="fixed bottom-4 right-4 bg-green-600 text-white px-3 py-1 rounded">
        Push notifications enabled!
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="fixed bottom-4 right-4 bg-red-600 text-white px-3 py-1 rounded">
        Failed to enable push notifications.
      </div>
    );
  }

  return (
    <button
      onClick={handleSubscribe}
      disabled={status === 'loading'}
      className="fixed bottom-4 right-4 bg-ubt-blue text-white px-3 py-1 rounded"
    >
      {status === 'loading' ? 'Subscribing…' : 'Enable Push'}
    </button>
  );
};

export default PushSubscribeButton;
