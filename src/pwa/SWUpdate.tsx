'use client';

import { useEffect, useRef, useState } from 'react';

const SWUpdate = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const initialController = useRef<ServiceWorker | null | undefined>();

  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
      return;
    }

    initialController.current = navigator.serviceWorker.controller;

    const handleControllerChange = () => {
      const newController = navigator.serviceWorker.controller ?? null;

      if (!initialController.current) {
        initialController.current = newController;
        return;
      }

      if (newController === initialController.current) {
        return;
      }

      setUpdateAvailable(true);
    };

    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);

    navigator.serviceWorker.ready
      .then((registration) => {
        if (registration.waiting) {
          setUpdateAvailable(true);
        }
      })
      .catch(() => {
        // No-op: readiness might reject if SW is disabled.
      });

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
    };
  }, []);

  if (!updateAvailable) {
    return null;
  }

  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[1000] flex max-w-sm justify-end"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto flex items-center gap-3 rounded-md border border-slate-600/60 bg-slate-900/95 px-4 py-3 text-sm text-white shadow-lg backdrop-blur">
        <span className="font-medium">Update ready</span>
        <button
          type="button"
          onClick={handleReload}
          className="rounded-md bg-sky-500 px-3 py-1 text-xs font-semibold text-slate-900 transition hover:bg-sky-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
        >
          Reload
        </button>
      </div>
    </div>
  );
};

export default SWUpdate;
