"use client";

import { useState } from 'react';
import DesktopLayout from '../../components/desktop/DesktopLayout';

export default function DevHealth() {
  const [status, setStatus] = useState('');

  const unregister = async () => {
    if (!('serviceWorker' in navigator)) {
      setStatus('Service workers are not supported');
      return;
    }
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((reg) => reg.unregister()));
    setStatus('Service workers unregistered');
  };

  return (
    <DesktopLayout title="Dev Health">
      <div className="p-4 space-y-4">
        <h1 className="text-xl font-bold">Dev Health</h1>
        <button
          onClick={unregister}
          className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-500"
        >
          Unregister SW
        </button>
        {status && <p>{status}</p>}
      </div>
    </DesktopLayout>
  );
}

