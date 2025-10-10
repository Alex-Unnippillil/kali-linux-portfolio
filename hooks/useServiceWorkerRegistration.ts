import { useEffect, useRef } from 'react';

type Logger = {
  error?: (...args: unknown[]) => void;
  warn?: (...args: unknown[]) => void;
  info?: (...args: unknown[]) => void;
};

type ManualRefreshHandler = () => void;
type ManualRefreshInvoker = () => Promise<void>;

type PeriodicSyncRegistration = {
  register: (tag: string, options: { minInterval: number }) => Promise<unknown>;
};

type PeriodicSyncCapableRegistration = ServiceWorkerRegistration & {
  periodicSync?: PeriodicSyncRegistration;
};

const ONE_DAY_IN_MS = 24 * 60 * 60 * 1000;

const defaultLogger: Required<Logger> = {
  error: (...args: unknown[]) => console.error(...args),
  warn: (...args: unknown[]) => console.warn(...args),
  info: (...args: unknown[]) => console.info(...args),
};

export interface UseServiceWorkerRegistrationOptions {
  enabled?: boolean;
  logger?: Logger;
  onManualRefreshAvailable?: (refresh: ManualRefreshInvoker) => void;
  onManualRefresh?: ManualRefreshHandler;
}

const isServiceWorkerSupported = () =>
  typeof window !== 'undefined' &&
  process.env.NODE_ENV === 'production' &&
  'serviceWorker' in navigator;

export function useServiceWorkerRegistration({
  enabled = isServiceWorkerSupported(),
  logger,
  onManualRefreshAvailable,
  onManualRefresh,
}: UseServiceWorkerRegistrationOptions = {}) {
  const loggerRef = useRef({ ...defaultLogger, ...(logger ?? {}) });
  loggerRef.current = { ...defaultLogger, ...(logger ?? {}) };

  const manualRefreshRef = useRef<ManualRefreshHandler | undefined>(onManualRefresh);
  manualRefreshRef.current = onManualRefresh;

  const manualRefreshAvailableRef = useRef(onManualRefreshAvailable);
  manualRefreshAvailableRef.current = onManualRefreshAvailable;

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        const registration = (await navigator.serviceWorker.register(
          '/sw.js'
        )) as PeriodicSyncCapableRegistration;

        const manualRefresh: ManualRefreshInvoker = async () => {
          try {
            await registration.update();
            manualRefreshRef.current?.();
          } catch (error) {
            loggerRef.current.error?.('Manual service worker refresh failed', error);
            throw error;
          }
        };

        manualRefreshAvailableRef.current?.(manualRefresh);

        const periodicSync = registration.periodicSync;
        const queryPermissions = navigator.permissions?.query?.bind(navigator.permissions);

        if (periodicSync && typeof periodicSync.register === 'function' && queryPermissions) {
          try {
            const status = await queryPermissions({
              name: 'periodic-background-sync',
            } as PermissionDescriptor);

            if (status.state === 'granted') {
              await periodicSync.register('content-sync', {
                minInterval: ONE_DAY_IN_MS,
              });
              return;
            }
          } catch (error) {
            loggerRef.current.warn?.(
              'Periodic sync permission query failed; falling back to manual update',
              error
            );
          }
        }

        await registration.update();
      } catch (error) {
        loggerRef.current.error?.('Service worker registration failed', error);
      }
    };

    registerServiceWorker().catch((error) => {
      loggerRef.current.error?.('Service worker setup failed', error);
    });
  }, [enabled]);
}

export default useServiceWorkerRegistration;
