import React, { useState, useEffect, useRef, useCallback } from 'react';
import FormError from '../ui/FormError';
import {
  loadProfiles,
  loadProfile,
  saveProfile,
  renameProfile,
  deleteProfile,
  SavedProfile,
  ServiceData,
  CharacteristicData,
} from '../../utils/bleProfiles';

type BluetoothDevice = any;
type BluetoothRemoteGATTServer = any;

const MAX_RETRIES = 3;
const CONNECT_TIMEOUT = 10000;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const BleSensor: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const [deviceName, setDeviceName] = useState('');
  const [services, setServices] = useState<ServiceData[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'prompt' | 'scanning' | 'connecting' | 'connected' | 'error'
  >('idle');
  const [showPreflight, setShowPreflight] = useState(false);
  const [acknowledgedPreflight, setAcknowledgedPreflight] = useState(false);
  const [logEntries, setLogEntries] = useState<string[]>([]);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const appendLog = useCallback((entry: string) => {
    setLogEntries((prev) => {
      const next = [...prev, entry];
      return next.slice(-40);
    });
  }, []);

  const refreshProfiles = useCallback(async () => {
    setProfiles(await loadProfiles());
  }, []);

  useEffect(() => {
    refreshProfiles();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('ble-profiles');
      bc.onmessage = () => refreshProfiles();
      bcRef.current = bc;
      return () => bc.close();
    }
  }, [refreshProfiles]);

  useEffect(() => {
    if (!supported) {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
      const message = `Web Bluetooth unsupported. UA: ${ua}`;
      appendLog(message);
      if (typeof console !== 'undefined') {
        console.info(message);
      }
    }
  }, [appendLog, supported]);

  const connectWithRetry = useCallback(
    async (
      device: BluetoothDevice,
      retries = MAX_RETRIES
    ): Promise<BluetoothRemoteGATTServer> => {
      let lastError: unknown = new Error('Unable to connect');
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          appendLog(`Connecting (attempt ${attempt}/${retries})...`);
          const server = (await Promise.race([
            device.gatt!.connect(),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Connection timed out')), CONNECT_TIMEOUT)
            ),
          ])) as BluetoothRemoteGATTServer;
          appendLog('Connection established.');
          return server;
        } catch (err) {
          lastError = err;
          appendLog(
            `Attempt ${attempt} failed: ${(err as Error).message || 'Unknown error'}`
          );
          if (attempt < retries) {
            appendLog('Retrying...');
            await delay(1000 * attempt);
          }
        }
      }
      throw lastError;
    },
    [appendLog]
  );

  const startScan = useCallback(async () => {
    if (!supported) return;
    setBusy(true);
    setStatus('scanning');
    setError('');
    appendLog('Starting Bluetooth scan. Waiting for device selection.');
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information'],
      });

      const saved = await loadProfile(device.id);
      if (saved) {
        setDeviceName(saved.name);
        setServices(saved.services);
        setStatus('connected');
        appendLog(`Loaded saved profile for ${saved.name}.`);
        return;
      }

      setDeviceName(device.name || 'Unknown device');

      setStatus('connecting');
      appendLog('Connecting to selected device.');
      const server = await connectWithRetry(device);

      device.addEventListener('gattserverdisconnected', () => {
        setError('Device disconnected.');
        setStatus('error');
        appendLog('Device disconnected unexpectedly.');
      });

      const primServices = await server.getPrimaryServices();
      const serviceData: ServiceData[] = [];

      for (const service of primServices) {
        const chars = await service.getCharacteristics();
        const charData: CharacteristicData[] = await Promise.all(
          chars.map(async (char: any) => {
            try {
              const val = await char.readValue();
              const decoder = new TextDecoder();
              return { uuid: char.uuid, value: decoder.decode(val.buffer) };
            } catch {
              return { uuid: char.uuid, value: '[unreadable]' };
            }
          })
        );
        serviceData.push({ uuid: service.uuid, characteristics: charData });
      }
      setServices(serviceData);
      await saveProfile(device.id, {
        name: device.name || 'Unknown device',
        services: serviceData,
      });
      bcRef.current?.postMessage('update');
      await refreshProfiles();
      setStatus('connected');
      appendLog('Services read and cached locally.');
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError') {
        setError('Permission to access Bluetooth was denied.');
      } else if (e.name === 'NotFoundError') {
        setError('No devices found.');
      } else {
        setError(e.message || 'An unknown error occurred.');
      }
      setStatus('error');
      appendLog(`Scan failed: ${e.message || e.name || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [appendLog, connectWithRetry, refreshProfiles, supported]);

  const handleScan = useCallback(() => {
    if (!supported || busy) return;
    if (!acknowledgedPreflight) {
      setShowPreflight(true);
      setStatus('prompt');
      return;
    }
    void startScan();
  }, [acknowledgedPreflight, busy, startScan, supported]);

  const handleConfirmPreflight = useCallback(() => {
    setAcknowledgedPreflight(true);
    setShowPreflight(false);
    void startScan();
  }, [startScan]);

  const handleCancelPreflight = useCallback(() => {
    setShowPreflight(false);
    setStatus('idle');
    appendLog('Scan cancelled at preflight dialog.');
  }, [appendLog]);

  const statusLabels: Record<
    'idle' | 'prompt' | 'scanning' | 'connecting' | 'connected' | 'error',
    string
  > = {
    idle: 'Idle',
    prompt: 'Awaiting confirmation',
    scanning: 'Scanning for devices',
    connecting: 'Connecting',
    connected: 'Connected',
    error: 'Needs attention',
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-black p-4 text-white">
      {showPreflight && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded bg-gray-900 p-4 shadow-lg">
            <h2 className="mb-2 text-lg font-bold" data-locale-key="connections.preflight.title">
              Before we scan
            </h2>
            <p className="text-sm text-gray-200" data-locale-key="connections.preflight.bleSummary">
              This tool will request permission to read your nearby Bluetooth device name, service identifiers, and characteristic values so it can display them within this simulator.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-200">
              <li data-locale-key="connections.preflight.localOnly">
                Data stays on this page and remains only in your browser; nothing is sent to external services.
              </li>
              <li data-locale-key="connections.preflight.fallback">
                If Bluetooth access is denied or unsupported, load a saved profile or switch to a Chromium-based browser on desktop.
              </li>
              <li data-locale-key="connections.preflight.retry">
                You can retry the scan at any time if the device is asleep or out of range.
              </li>
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={handleCancelPreflight}
                className="rounded bg-gray-700 px-3 py-1 text-sm"
                data-locale-key="connections.preflight.cancel"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPreflight}
                className="rounded bg-blue-600 px-3 py-1 text-sm"
                data-locale-key="connections.preflight.continue"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {!supported && (
        <p className="mb-4 text-sm text-yellow-400">
          Web Bluetooth is not supported in this browser.
        </p>
      )}

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={handleScan}
          disabled={!supported || busy}
          className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
          data-locale-key="connections.actions.scan"
        >
          Scan for Devices
        </button>
        <p className="text-xs text-gray-300" data-locale-key="connections.status" aria-live="polite">
          Status: {statusLabels[status]}
        </p>
      </div>

      {status === 'error' && !busy && (
        <button
          onClick={handleScan}
          className="mb-2 self-start rounded border border-blue-400 px-3 py-1 text-sm"
          data-locale-key="connections.actions.retryScan"
        >
          Retry Scan
        </button>
      )}

      {error && <FormError className="mt-0 mb-4">{error}</FormError>}

      {profiles.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 font-bold">Saved Profiles</p>
          <ul className="space-y-1">
            {profiles.map((p) => (
              <li key={p.deviceId} className="flex items-center space-x-2">
                <input
                  defaultValue={p.name}
                  onBlur={async (e) => {
                    await renameProfile(p.deviceId, e.target.value);
                    bcRef.current?.postMessage('update');
                    await refreshProfiles();
                  }}
                  className="w-40 bg-gray-800 px-1"
                  aria-label="Rename saved profile"
                  data-locale-key="connections.savedProfiles.renameLabel"
                />
                <button
                  onClick={async () => {
                    await deleteProfile(p.deviceId);
                    bcRef.current?.postMessage('update');
                    await refreshProfiles();
                  }}
                  className="text-red-400"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {deviceName && (
        <p className="mb-2" data-locale-key="connections.connectedLabel">
          Connected to: {deviceName}
        </p>
      )}

      <ul className="space-y-2 overflow-auto">
        {services.map((service) => (
          <li key={service.uuid} className="border-b border-gray-700 pb-2">
            <p className="font-bold">Service: {service.uuid}</p>
            <ul className="ml-4 list-disc">
              {service.characteristics.map((char) => (
                <li key={char.uuid}>
                  {char.uuid}: {char.value}
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="mt-4 h-28 overflow-auto rounded bg-gray-900 p-2 text-xs">
        {logEntries.length === 0 ? (
          <p className="text-gray-400" data-locale-key="connections.log.empty">
            Activity log will appear here.
          </p>
        ) : (
          logEntries.map((entry, idx) => <p key={`${entry}-${idx}`}>{entry}</p>)
        )}
      </div>
    </div>
  );
};

export default BleSensor;
export const displayBleSensor = () => <BleSensor />;

