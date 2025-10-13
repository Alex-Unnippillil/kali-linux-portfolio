'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Workbox } from 'workbox-window';

import Toast from '../ui/Toast';

declare global {
  interface Window {
    workbox?: Workbox;
  }
}

const UPDATE_MESSAGE = 'New update available. Reload to apply the latest changes.';

const POLL_INTERVAL_MS = 250;
const MAX_POLL_ATTEMPTS = 40;

const ServiceWorkerUpdateAnnouncer: React.FC = () => {
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const workboxRef = useRef<Workbox | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;

    let isMounted = true;
    let pollId: ReturnType<typeof window.setInterval> | null = null;

    const detachListeners = () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    };

    const handleWaiting = () => {
      if (!isMounted) return;
      setToastMessage(UPDATE_MESSAGE);
    };

    const handleControlling = () => {
      if (!isMounted) return;
      setToastMessage(null);
      reloadingRef.current = false;
    };

    const attachListeners = (wb: Workbox) => {
      detachListeners();
      workboxRef.current = wb;
      wb.addEventListener('waiting', handleWaiting);
      wb.addEventListener('externalwaiting', handleWaiting);
      wb.addEventListener('controlling', handleControlling);

      cleanupRef.current = () => {
        wb.removeEventListener('waiting', handleWaiting);
        wb.removeEventListener('externalwaiting', handleWaiting);
        wb.removeEventListener('controlling', handleControlling);
      };
    };

    const tryAttach = () => {
      const candidate = window.workbox;
      if (candidate && typeof candidate.addEventListener === 'function') {
        attachListeners(candidate);
        if (pollId) {
          window.clearInterval(pollId);
          pollId = null;
        }
        return true;
      }
      return false;
    };

    if (!tryAttach()) {
      let attempts = 0;
      pollId = window.setInterval(() => {
        attempts += 1;
        if (tryAttach() || attempts >= MAX_POLL_ATTEMPTS) {
          if (pollId) {
            window.clearInterval(pollId);
            pollId = null;
          }
        }
      }, POLL_INTERVAL_MS);
    }

    return () => {
      isMounted = false;
      if (pollId) {
        window.clearInterval(pollId);
      }
      detachListeners();
    };
  }, []);

  const handleDismiss = useCallback(() => {
    reloadingRef.current = false;
    setToastMessage(null);
  }, []);

  const handleReload = useCallback(() => {
    const reloadPage = () => {
      reloadingRef.current = false;
      window.location.reload();
    };

    const wb = workboxRef.current;
    if (!wb) {
      reloadPage();
      return;
    }

    if (reloadingRef.current) return;
    reloadingRef.current = true;

    const handleControlling = () => {
      wb.removeEventListener('controlling', handleControlling);
      reloadPage();
    };

    wb.addEventListener('controlling', handleControlling);
    void wb.messageSkipWaiting().catch(() => {
      wb.removeEventListener('controlling', handleControlling);
      reloadPage();
    });
  }, []);

  if (!toastMessage) return null;

  return (
    <Toast
      message={toastMessage}
      actionLabel="Reload now"
      onAction={handleReload}
      onClose={handleDismiss}
      duration={null}
    />
  );
};

export default ServiceWorkerUpdateAnnouncer;

