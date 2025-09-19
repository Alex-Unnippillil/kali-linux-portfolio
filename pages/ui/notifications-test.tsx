"use client";

import React, { useEffect } from 'react';
import { useNotifications } from '../../components/ui/ToastProvider';

const NotificationTestPage: React.FC = () => {
  const { notify, clear } = useNotifications();

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return;
    }
    const hideFouc = document.head.querySelector('style[data-next-hide-fouc]');
    if (hideFouc) {
      hideFouc.remove();
    }
    document.body.style.display = '';

    const scopedWindow = window as typeof window & {
      __notificationsTestReady?: boolean;
    };
    scopedWindow.__notificationsTestReady = true;

    return () => {
      delete scopedWindow.__notificationsTestReady;
    };
  }, []);

  const spawnToast = (message: string) => () => {
    void notify({ message, duration: 20000 });
  };

  const spawnLongToast = () => {
    void notify({
      message:
        'This is a longer notification intended to exercise the background formatter worker. It includes multiple sentences, spacing, and should still be swipe-dismissable without lag.',
      duration: 20000,
    });
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gray-900 p-6 text-white">
      <h1 className="text-3xl font-semibold">Toast Playground</h1>
      <p className="max-w-xl text-center text-sm text-gray-200">
        Use the controls below to enqueue notifications. Drag or swipe horizontally to dismiss them, or press the Escape key while
        focused on a toast.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={spawnToast('Swipe to dismiss me')}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow focus:outline-none focus:ring-2 focus:ring-blue-300"
          data-testid="spawn-toast"
        >
          Spawn toast
        </button>
        <button
          type="button"
          onClick={spawnToast('Swipe to dismiss me')}
          className="rounded bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow focus:outline-none focus:ring-2 focus:ring-blue-200"
          data-testid="spawn-duplicate"
        >
          Spawn duplicate
        </button>
        <button
          type="button"
          onClick={spawnLongToast}
          className="rounded bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow focus:outline-none focus:ring-2 focus:ring-purple-300"
          data-testid="spawn-long"
        >
          Spawn long toast
        </button>
        <button
          type="button"
          onClick={() => clear()}
          className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white shadow focus:outline-none focus:ring-2 focus:ring-gray-400"
          data-testid="clear-toasts"
        >
          Clear
        </button>
      </div>
    </main>
  );
};

export default NotificationTestPage;
