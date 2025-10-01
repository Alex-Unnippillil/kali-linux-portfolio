"use client";

import { useCallback, useEffect, useRef } from 'react';
import { PeriodicSyncStatus, useSettings } from '../../hooks/useSettings';

const PERIODIC_SYNC_TAG = 'content-sync';
const PERIODIC_SYNC_INTERVAL = 24 * 60 * 60 * 1000;
const FALLBACK_INITIAL_DELAY = 60 * 1000;
const FALLBACK_INTERVAL = PERIODIC_SYNC_INTERVAL;

type PeriodicSyncResultMessage = {
  type: 'PERIODIC_SYNC_RESULT';
  status: PeriodicSyncStatus['status'];
  timestamp: number;
  failed?: string[];
  message?: string;
  trigger?: string;
};

type NavigatorWithPermissions = Navigator & {
  permissions?: {
    query: (query: { name: PermissionName }) => Promise<PermissionStatus>;
  };
};

const getNavigator = (): NavigatorWithPermissions | null => {
  if (typeof globalThis === 'undefined') return null;
  const candidate = (globalThis as { navigator?: NavigatorWithPermissions }).navigator;
  return candidate ?? null;
};

export const applyPeriodicSyncPreference = async (
  registration: ServiceWorkerRegistration,
  enabled: boolean,
  scheduleFallback: (registration: ServiceWorkerRegistration) => void,
  clearFallback: () => void,
): Promise<void> => {
  clearFallback();
  if (!registration) return;

  if ('periodicSync' in registration && registration.periodicSync) {
    try {
      const tags = await registration.periodicSync.getTags();
      const isRegistered = tags.includes(PERIODIC_SYNC_TAG);

      if (enabled) {
        if (!isRegistered) {
          let permissionGranted = true;
          const navigatorWithPermissions = getNavigator();
          const permissionsApi = navigatorWithPermissions?.permissions;

          if (permissionsApi && typeof permissionsApi.query === 'function') {
            try {
              const status = await permissionsApi.query({
                name: 'periodic-background-sync' as PermissionName,
              });
              permissionGranted = status.state === 'granted';
            } catch (error) {
              permissionGranted = false;
            }
          }

          if (permissionGranted) {
            await registration.periodicSync.register(PERIODIC_SYNC_TAG, {
              minInterval: PERIODIC_SYNC_INTERVAL,
            });
          } else {
            scheduleFallback(registration);
          }
        }
      } else if (isRegistered) {
        await registration.periodicSync.unregister(PERIODIC_SYNC_TAG);
      }
      return;
    } catch (error) {
      console.error('Periodic sync update failed', error);
      if (!enabled) {
        return;
      }
    }
  }

  if (enabled) {
    scheduleFallback(registration);
  }
};

const ServiceWorkerManager = (): null => {
  const {
    periodicSyncEnabled,
    setPeriodicSyncStatus,
  } = useSettings();
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const latestEnabledRef = useRef(periodicSyncEnabled);

  const clearFallback = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      if (typeof globalThis !== 'undefined' && typeof globalThis.clearTimeout === 'function') {
        globalThis.clearTimeout(fallbackTimerRef.current);
      }
      fallbackTimerRef.current = null;
    }
  }, []);

  const scheduleFallback = useCallback(
    (registration: ServiceWorkerRegistration) => {
      clearFallback();

      const triggerSync = () => {
        if (registration.active) {
          registration.active.postMessage({
            type: 'run-sync',
            trigger: 'fallback',
          });
        }
        if (typeof globalThis !== 'undefined' && typeof globalThis.setTimeout === 'function') {
          fallbackTimerRef.current = globalThis.setTimeout(triggerSync, FALLBACK_INTERVAL);
        }
      };

      if (typeof globalThis !== 'undefined' && typeof globalThis.setTimeout === 'function') {
        fallbackTimerRef.current = globalThis.setTimeout(triggerSync, FALLBACK_INITIAL_DELAY);
      }
    },
    [clearFallback],
  );

  useEffect(() => {
    latestEnabledRef.current = periodicSyncEnabled;
    if (!periodicSyncEnabled) {
      clearFallback();
      setPeriodicSyncStatus(null);
    }
  }, [periodicSyncEnabled, clearFallback, setPeriodicSyncStatus]);

  useEffect(() => {
    const navigatorWithSW = getNavigator();
    if (!navigatorWithSW || !('serviceWorker' in navigatorWithSW)) return;
    if (process.env.NODE_ENV !== 'production') return;

    let cancelled = false;

    const register = async () => {
      try {
        const registration = await navigatorWithSW.serviceWorker.register('/sw.js');
        if (cancelled) return;
        registrationRef.current = registration;
        if (typeof globalThis !== 'undefined') {
          (globalThis as { manualRefresh?: () => Promise<void> }).manualRefresh = () => registration.update();
        }
        await applyPeriodicSyncPreference(
          registration,
          latestEnabledRef.current,
          scheduleFallback,
          clearFallback,
        );
      } catch (error) {
        console.error('Service worker registration failed', error);
      }
    };

    register();

    return () => {
      cancelled = true;
      clearFallback();
    };
  }, [scheduleFallback, clearFallback]);

  useEffect(() => {
    const registration = registrationRef.current;
    if (!registration) return;

    applyPeriodicSyncPreference(registration, periodicSyncEnabled, scheduleFallback, clearFallback).catch(
      (error) => {
        console.error('Failed to update periodic sync preference', error);
      },
    );
  }, [periodicSyncEnabled, scheduleFallback, clearFallback]);

  useEffect(() => {
    const navigatorWithSW = getNavigator();
    const serviceWorker = navigatorWithSW?.serviceWorker;
    if (!serviceWorker) return;

    const handleMessage = (event: MessageEvent<PeriodicSyncResultMessage>) => {
      const data = event.data;
      if (!data || data.type !== 'PERIODIC_SYNC_RESULT') return;
      setPeriodicSyncStatus({
        status: data.status,
        timestamp: data.timestamp,
        failed: data.failed,
        message: data.message,
        trigger: data.trigger,
      });
    };

    serviceWorker.addEventListener('message', handleMessage);
    return () => {
      serviceWorker.removeEventListener('message', handleMessage);
    };
  }, [setPeriodicSyncStatus]);

  return null;
};

export default ServiceWorkerManager;
