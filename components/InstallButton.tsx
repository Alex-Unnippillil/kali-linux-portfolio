"use client";

import { useEffect, useMemo, useState } from 'react';
import { trackEvent } from '@/lib/analytics-client';
import { showA2HS } from '@/src/pwa/a2hs';
import {
  readStoredStatus,
  subscribeToStatus,
  STATUS_DEFAULT_MESSAGES,
  type PwaStatus,
} from '@/src/pwa/status';

const InstallButton: React.FC = () => {
  const initialStatus = useMemo<PwaStatus | null>(() => readStoredStatus(), []);
  const [message, setMessage] = useState<string>(
    initialStatus ? initialStatus.message || STATUS_DEFAULT_MESSAGES[initialStatus.type] : '',
  );
  const [installVisible, setInstallVisible] = useState<boolean>(initialStatus?.action === 'install');
  const [updateVisible, setUpdateVisible] = useState<boolean>(initialStatus?.action === 'reload');

  useEffect(() => {
    const applyStatus = (incoming: PwaStatus) => {
      const nextMessage = incoming.message || STATUS_DEFAULT_MESSAGES[incoming.type] || '';
      setMessage(nextMessage);
      setInstallVisible(incoming.action === 'install');
      setUpdateVisible(incoming.action === 'reload');
    };

    const unsubscribe = subscribeToStatus(applyStatus);

    const handler = () =>
      applyStatus({
        type: 'install-ready',
        action: 'install',
        message: STATUS_DEFAULT_MESSAGES['install-ready'],
      });

    (window as any).addEventListener('a2hs:available', handler);

    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
      (window as any).removeEventListener('a2hs:available', handler);
    };
  }, []);

  const handleInstall = async () => {
    const shown = await showA2HS();
    if (shown) {
      trackEvent('cta_click', { location: 'install_button' });
      setInstallVisible(false);
      setMessage('Follow the browser prompt to finish installing.');
    }
  };

  const handleReload = () => {
    if (typeof window === 'undefined') return;
    if (typeof (window as any).manualRefresh === 'function') {
      (window as any).manualRefresh();
    } else {
      window.location.reload();
    }
  };

  if (!installVisible && !updateVisible && !message) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-xs flex-col gap-2 text-sm text-white">
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="rounded border border-white/10 bg-slate-900/90 px-3 py-2 shadow-lg backdrop-blur"
        >
          {message}
        </div>
      )}
      {installVisible && (
        <button
          onClick={handleInstall}
          className="rounded bg-ubt-blue px-3 py-1 font-medium text-white shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          type="button"
        >
          Install
        </button>
      )}
      {updateVisible && (
        <button
          onClick={handleReload}
          className="rounded bg-ubb-orange px-3 py-1 font-medium text-slate-950 shadow focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          type="button"
        >
          Reload to update
        </button>
      )}
    </div>
  );
};

export default InstallButton;
