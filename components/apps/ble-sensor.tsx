import React, { useState, useEffect, useRef } from 'react';
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

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const filterServices = (
  services: ServiceData[],
  query: string
): ServiceData[] => {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return services;

  return services
    .map((service) => {
      const serviceMatches = service.uuid.toLowerCase().includes(normalized);
      if (serviceMatches) return service;

      const matchingCharacteristics = service.characteristics.filter(
        (char) =>
          char.uuid.toLowerCase().includes(normalized) ||
          char.value.toLowerCase().includes(normalized)
      );

      if (!matchingCharacteristics.length) return null;
      return {
        ...service,
        characteristics: matchingCharacteristics,
      };
    })
    .filter((service): service is ServiceData => service !== null);
};

const BleSensor: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const [deviceName, setDeviceName] = useState('');
  const [services, setServices] = useState<ServiceData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDeviceId, setActiveDeviceId] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [profiles, setProfiles] = useState<SavedProfile[]>([]);
  const bcRef = useRef<BroadcastChannel | null>(null);

  const refreshProfiles = async () => setProfiles(await loadProfiles());

  useEffect(() => {
    refreshProfiles();
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      const bc = new BroadcastChannel('ble-profiles');
      bc.onmessage = () => refreshProfiles();
      bcRef.current = bc;
      return () => bc.close();
    }
  }, []);

  const connectWithRetry = async (
    device: BluetoothDevice,
    retries = MAX_RETRIES
  ): Promise<BluetoothRemoteGATTServer> => {
    let lastError: unknown = new Error('Unable to connect');
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        return await device.gatt!.connect();
      } catch (err) {
        lastError = err;
        if (attempt < retries) {
          await delay(1000 * attempt);
        }
      }
    }
    throw lastError;
  };

  const handleScan = async () => {
    if (!supported || busy) return;
    setError('');
    setBusy(true);

    const consent = window.confirm(
      'This application will request access to nearby Bluetooth devices. Continue?'
    );
    if (!consent) {
      setBusy(false);
      return;
    }

    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information'],
      });

      const saved = await loadProfile(device.id);
      if (saved) {
        setActiveDeviceId(saved.deviceId);
        setDeviceName(saved.name);
        setServices(saved.services);
        return;
      }

      setDeviceName(device.name || 'Unknown device');

      const server = await connectWithRetry(device);

      device.addEventListener('gattserverdisconnected', () =>
        setError('Device disconnected.')
      );

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
      setActiveDeviceId(device.id);
      await saveProfile(device.id, {
        name: device.name || 'Unknown device',
        services: serviceData,
      });
      bcRef.current?.postMessage('update');
      await refreshProfiles();
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError') {
        setError('Permission to access Bluetooth was denied.');
      } else if (e.name === 'NotFoundError') {
        setError('No devices found.');
      } else {
        setError(e.message || 'An unknown error occurred.');
      }
    } finally {
      setBusy(false);
    }
  };

  const filteredServices = filterServices(services, searchQuery);
  const characteristicCount = filteredServices.reduce(
    (sum, service) => sum + service.characteristics.length,
    0
  );

  const downloadActiveProfile = () => {
    if (!activeDeviceId) return;

    const payload = {
      deviceId: activeDeviceId,
      name: deviceName || 'Unknown device',
      exportedAt: new Date().toISOString(),
      services,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `ble-profile-${activeDeviceId}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full bg-black p-4 text-white">
      {!supported && (
        <p className="mb-4 text-sm text-yellow-400">
          Web Bluetooth is not supported in this browser.
        </p>
      )}

      <button
        onClick={handleScan}
        disabled={!supported || busy}
        className="mb-4 rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
      >
        Scan for Devices
      </button>

      <div className="mb-4 rounded border border-gray-700 bg-gray-900/70 p-3 text-xs text-gray-200">
        <p>
          <span className="font-semibold text-white">Quick Stats:</span>{' '}
          {filteredServices.length} service
          {filteredServices.length === 1 ? '' : 's'} · {characteristicCount}{' '}
          characteristic{characteristicCount === 1 ? '' : 's'}
        </p>
        <p className="mt-1 text-gray-400">
          Tip: filter by UUID or characteristic value to quickly inspect large
          BLE profiles.
        </p>
      </div>

      {error && <FormError className="mt-0 mb-4">{error}</FormError>}

      {profiles.length > 0 && (
        <div className="mb-4">
          <p className="mb-2 font-bold">Saved Profiles</p>
          <ul className="space-y-1">
            {profiles.map((p) => (
              <li key={p.deviceId} className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    setActiveDeviceId(p.deviceId);
                    setDeviceName(p.name);
                    setServices(p.services);
                    setError('');
                  }}
                  className="rounded border border-gray-600 px-2 py-0.5 text-xs text-blue-300 hover:bg-gray-800"
                >
                  Load
                </button>
                <input
                  aria-label={`Rename profile ${p.name}`}
                  defaultValue={p.name}
                  onBlur={async (e) => {
                    await renameProfile(p.deviceId, e.target.value);
                    bcRef.current?.postMessage('update');
                    await refreshProfiles();
                  }}
                  className="w-40 bg-gray-800 px-1"
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

      {deviceName && <p className="mb-2">Connected to: {deviceName}</p>}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          aria-label="Filter Bluetooth services and characteristics"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter services/characteristics…"
          className="w-full max-w-md rounded border border-gray-700 bg-gray-900 px-2 py-1 text-sm text-white placeholder:text-gray-500"
        />
        <button
          onClick={downloadActiveProfile}
          disabled={!services.length || !activeDeviceId}
          className="rounded border border-gray-600 px-3 py-1 text-sm text-cyan-200 disabled:opacity-40"
        >
          Export JSON
        </button>
      </div>

      <ul className="space-y-2 overflow-auto">
        {filteredServices.map((service) => (
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

      {!filteredServices.length && services.length > 0 && (
        <p className="mt-3 text-sm text-gray-400">
          No services matched your filter.
        </p>
      )}
    </div>
  );
};

export default BleSensor;
export const displayBleSensor = () => <BleSensor />;
