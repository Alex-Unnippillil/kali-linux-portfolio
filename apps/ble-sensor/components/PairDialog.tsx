'use client';

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import FormError from '@/components/ui/FormError';

const MAX_RECONNECT_ATTEMPTS = 3;
const DEFAULT_SERVICES = ['battery_service', 'device_information'];

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

interface BluetoothRemoteGATTServerLike {
  connected?: boolean;
  disconnect?: () => void;
}

interface BluetoothGattLike {
  connect: () => Promise<BluetoothRemoteGATTServerLike>;
  disconnect?: () => void;
}

interface BluetoothDeviceLike extends EventTarget {
  id?: string;
  name?: string;
  gatt?: BluetoothGattLike;
}

interface RequestDeviceOptionsLike {
  acceptAllDevices?: boolean;
  optionalServices?: string[];
  filters?: Array<Record<string, unknown>>;
}

interface BluetoothAdapterLike {
  requestDevice: (
    options: RequestDeviceOptionsLike,
  ) => Promise<BluetoothDeviceLike>;
}

interface PermissionHelp {
  reason: string;
  helpLink?: { href: string; label: string };
  steps?: string[];
}

type Status =
  | { phase: 'idle' }
  | { phase: 'unsupported' }
  | { phase: 'requesting' }
  | { phase: 'connecting'; deviceName: string }
  | { phase: 'connected'; deviceName: string; lastReconnect: boolean }
  | { phase: 'retrying'; deviceName: string; attempt: number }
  | { phase: 'disconnected'; deviceName: string; message?: string }
  | { phase: 'error'; message: string; permission?: PermissionHelp };

export interface PairDialogProps {
  open: boolean;
  onClose: () => void;
  optionalServices?: string[];
  bluetooth?: BluetoothAdapterLike | null;
  onConnected?: (session: {
    device: BluetoothDeviceLike;
    server: BluetoothRemoteGATTServerLike;
    reconnected: boolean;
  }) => void;
}

const getDeviceName = (device: BluetoothDeviceLike | null) =>
  device?.name || 'Unknown device';

const isDomException = (error: unknown): error is DOMException =>
  typeof DOMException !== 'undefined' && error instanceof DOMException;

const permissionHelpForError = (error: unknown): PermissionHelp | null => {
  if (!isDomException(error)) return null;

  switch (error.name) {
    case 'NotAllowedError':
      return {
        reason: 'Permission to use Bluetooth devices was denied.',
        helpLink: {
          href: 'https://support.google.com/chrome/answer/9699928?hl=en#zippy=%2Callow-or-block-sites-from-using-bluetooth',
          label: 'Review site permissions',
        },
        steps: [
          'Open your browser settings and search for "Bluetooth".',
          'Allow this site to access nearby Bluetooth devices.',
          'Reload the page and try pairing again.',
        ],
      };
    case 'SecurityError':
      return {
        reason:
          'The current context is not secure enough for Web Bluetooth interactions.',
        steps: [
          'Use HTTPS or run the experience from localhost.',
          'Close extra browser windows that may be blocking the request.',
          'Refresh the page before attempting to pair again.',
        ],
      };
    default:
      return null;
  }
};

const messageFromError = (error: unknown) => {
  if (isDomException(error)) {
    return error.message || error.name;
  }
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === 'string') {
    return error;
  }
  return 'An unknown error occurred while pairing.';
};

const useBluetoothAdapter = (
  override?: BluetoothAdapterLike | null,
): BluetoothAdapterLike | null =>
  useMemo(() => {
    if (override) return override;
    if (typeof navigator === 'undefined') return null;
    const nav = navigator as Navigator & {
      bluetooth?: BluetoothAdapterLike;
    };
    return nav.bluetooth ?? null;
  }, [override]);

const PairDialog: React.FC<PairDialogProps> = ({
  open,
  onClose,
  optionalServices,
  bluetooth,
  onConnected,
}) => {
  const adapter = useBluetoothAdapter(bluetooth);
  const [status, setStatus] = useState<Status>(() =>
    adapter ? { phase: 'idle' } : { phase: 'unsupported' },
  );
  const deviceRef = useRef<BluetoothDeviceLike | null>(null);
  const serverRef = useRef<BluetoothRemoteGATTServerLike | null>(null);
  const disconnectHandlerRef = useRef<((event: Event) => void) | null>(null);
  const attemptReconnectRef = useRef<((device: BluetoothDeviceLike) => void) | null>(
    null,
  );
  const reconnectInFlight = useRef(false);
  const services = optionalServices ?? DEFAULT_SERVICES;

  const cleanupConnections = useCallback(() => {
    const device = deviceRef.current;
    const handler = disconnectHandlerRef.current;
    if (device && handler && 'removeEventListener' in device) {
      device.removeEventListener('gattserverdisconnected', handler);
    }
    disconnectHandlerRef.current = null;

    const gatt = device?.gatt;
    if (gatt?.disconnect) {
      try {
        gatt.disconnect();
      } catch {
        // Swallow disconnect errors — browser implementations vary.
      }
    }

    const server = serverRef.current;
    if (server?.disconnect) {
      try {
        server.disconnect();
      } catch {
        // Ignore errors thrown while tearing down the mock server.
      }
    }

    deviceRef.current = null;
    serverRef.current = null;
    reconnectInFlight.current = false;
  }, []);

  useEffect(() => cleanupConnections, [cleanupConnections]);

  useEffect(() => {
    setStatus((current) => {
      if (!adapter) {
        return { phase: 'unsupported' };
      }
      if (current.phase === 'unsupported') {
        return { phase: 'idle' };
      }
      return current;
    });
  }, [adapter]);

  const connectGatt = useCallback(
    async (device: BluetoothDeviceLike, mode: 'initial' | 'reconnect') => {
      if (!device.gatt || typeof device.gatt.connect !== 'function') {
        throw new Error('The selected device does not expose a GATT server.');
      }
      const name = getDeviceName(device);
      let lastError: unknown = new Error('Unable to connect to the device.');
      const maxAttempts = mode === 'reconnect' ? MAX_RECONNECT_ATTEMPTS : 1;

      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        setStatus(
          mode === 'reconnect'
            ? { phase: 'retrying', deviceName: name, attempt }
            : { phase: 'connecting', deviceName: name },
        );
        try {
          const server = await device.gatt.connect();
          deviceRef.current = device;
          serverRef.current = server;

          const handler = () => {
            if (attemptReconnectRef.current) {
              attemptReconnectRef.current(device);
            }
          };

          if (disconnectHandlerRef.current && 'removeEventListener' in device) {
            device.removeEventListener(
              'gattserverdisconnected',
              disconnectHandlerRef.current,
            );
          }

          if ('addEventListener' in device) {
            device.addEventListener('gattserverdisconnected', handler);
            disconnectHandlerRef.current = handler;
          }

          setStatus({
            phase: 'connected',
            deviceName: name,
            lastReconnect: mode === 'reconnect',
          });
          onConnected?.({ device, server, reconnected: mode === 'reconnect' });
          return server;
        } catch (error) {
          lastError = error;
          if (mode === 'reconnect' && attempt < maxAttempts) {
            await delay(500 * attempt);
          }
        }
      }

      throw lastError;
    },
    [onConnected],
  );

  const handlePermissionOrGenericError = useCallback((error: unknown) => {
    const help = permissionHelpForError(error);
    if (help) {
      setStatus({ phase: 'error', message: help.reason, permission: help });
      return;
    }
    setStatus({ phase: 'error', message: messageFromError(error) });
  }, []);

  const attemptReconnect = useCallback(
    async (device: BluetoothDeviceLike) => {
      if (reconnectInFlight.current) return;
      reconnectInFlight.current = true;
      try {
        await connectGatt(device, 'reconnect');
      } catch (error) {
        setStatus({
          phase: 'disconnected',
          deviceName: getDeviceName(device),
          message: messageFromError(error),
        });
      } finally {
        reconnectInFlight.current = false;
      }
    },
    [connectGatt],
  );

  useEffect(() => {
    attemptReconnectRef.current = (device) => {
      void attemptReconnect(device);
    };
    return () => {
      attemptReconnectRef.current = null;
    };
  }, [attemptReconnect]);

  const startConnection = useCallback(async () => {
    if (!adapter) {
      setStatus({ phase: 'unsupported' });
      return;
    }

    setStatus({ phase: 'requesting' });
    try {
      const device = await adapter.requestDevice({
        acceptAllDevices: true,
        optionalServices: services,
      });
      deviceRef.current = device;
      await connectGatt(device, 'initial');
    } catch (error) {
      if (isDomException(error) && error.name === 'AbortError') {
        setStatus({ phase: 'idle' });
        return;
      }
      if (isDomException(error) && error.name === 'NotFoundError') {
        setStatus({
          phase: 'error',
          message:
            'No Bluetooth devices were found nearby. Ensure your sensor is discoverable and try again.',
        });
        return;
      }
      handlePermissionOrGenericError(error);
    }
  }, [adapter, connectGatt, handlePermissionOrGenericError, services]);

  const handleRetry = useCallback(() => {
    const device = deviceRef.current;
    if (device) {
      void attemptReconnect(device);
    } else {
      void startConnection();
    }
  }, [attemptReconnect, startConnection]);

  const handleDisconnect = useCallback(() => {
    cleanupConnections();
    setStatus(adapter ? { phase: 'idle' } : { phase: 'unsupported' });
  }, [adapter, cleanupConnections]);

  const handleClose = useCallback(() => {
    cleanupConnections();
    setStatus(adapter ? { phase: 'idle' } : { phase: 'unsupported' });
    onClose();
  }, [adapter, cleanupConnections, onClose]);

  useEffect(() => {
    if (!open) {
      cleanupConnections();
      setStatus(adapter ? { phase: 'idle' } : { phase: 'unsupported' });
    }
  }, [adapter, cleanupConnections, open]);

  const statusMessage = useMemo(() => {
    switch (status.phase) {
      case 'idle':
        return 'Select "Connect" to begin scanning for nearby devices.';
      case 'unsupported':
        return 'Web Bluetooth is not available in this browser. Try Chrome, Edge, or another compatible browser.';
      case 'requesting':
        return 'Requesting permission to access nearby Bluetooth devices…';
      case 'connecting':
        return `Connecting to ${status.deviceName}…`;
      case 'connected':
        return status.lastReconnect
          ? `Connection restored with ${status.deviceName}.`
          : `Connected to ${status.deviceName}.`;
      case 'retrying':
        return `Attempting to reconnect to ${status.deviceName} (${status.attempt}/${MAX_RECONNECT_ATTEMPTS})…`;
      case 'disconnected':
        return status.message
          ? status.message
          : `Lost connection to ${status.deviceName}. Use Retry to attempt reconnection.`;
      case 'error':
        return status.message;
      default:
        return '';
    }
  }, [status]);

  const busy =
    status.phase === 'requesting' ||
    status.phase === 'connecting' ||
    status.phase === 'retrying';

  const action = useMemo(() => {
    if (status.phase === 'unsupported') {
      return null;
    }

    if (status.phase === 'requesting') {
      return { label: 'Requesting…', onClick: undefined, disabled: true };
    }

    if (status.phase === 'connecting') {
      return { label: 'Connecting…', onClick: undefined, disabled: true };
    }

    if (status.phase === 'retrying') {
      return {
        label: `Retrying (${status.attempt}/${MAX_RECONNECT_ATTEMPTS})`,
        onClick: undefined,
        disabled: true,
      };
    }

    if (status.phase === 'connected') {
      return { label: 'Disconnect', onClick: handleDisconnect, disabled: false };
    }

    if (status.phase === 'disconnected') {
      return {
        label: deviceRef.current ? 'Retry connection' : 'Connect',
        onClick: handleRetry,
        disabled: busy,
      };
    }

    return {
      label: 'Connect',
      onClick: startConnection,
      disabled: busy,
    };
  }, [busy, handleDisconnect, handleRetry, startConnection, status]);

  if (!open) return null;

  const isErrorPhase =
    status.phase === 'error' ||
    status.phase === 'disconnected' ||
    status.phase === 'unsupported';

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
    >
      <div className="w-full max-w-md rounded bg-gray-900 p-6 text-white shadow-lg">
        <h2 className="text-xl font-semibold">Pair a BLE Sensor</h2>
        <p className="mt-4 text-sm" role="status" aria-live="polite">
          {statusMessage}
        </p>

        {status.phase === 'retrying' && (
          <p className="mt-2 text-xs text-gray-300">
            We will keep trying automatically. Use the Retry button if you want to
            force another attempt now.
          </p>
        )}

        {isErrorPhase && (
          <FormError className="mt-4">{statusMessage}</FormError>
        )}

        {status.phase === 'error' && status.permission?.steps && (
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-gray-200">
            {status.permission.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        )}

        {status.phase === 'error' && status.permission?.helpLink && (
          <a
            href={status.permission.helpLink.href}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-sm text-blue-400 underline"
          >
            {status.permission.helpLink.label}
          </a>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={handleClose}
            className="rounded bg-gray-700 px-4 py-2 text-sm hover:bg-gray-600"
          >
            Close
          </button>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`rounded px-4 py-2 text-sm ${
                action.disabled
                  ? 'cursor-not-allowed bg-gray-600 text-gray-300'
                  : 'bg-blue-600 text-white hover:bg-blue-500'
              }`}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PairDialog;
