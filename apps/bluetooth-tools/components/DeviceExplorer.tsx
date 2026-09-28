'use client';

import React, { useEffect, useState } from 'react';
import FormError from '../../../components/ui/FormError';

interface DeviceInfo {
  id: string;
  name: string;
  services: string[];
}

const DeviceExplorer: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const readServices = async (device: BluetoothDevice): Promise<string[]> => {
    try {
      const server = device.gatt?.connected ? device.gatt : await device.gatt?.connect();
      if (!server) return [];
      const services = await server.getPrimaryServices();
      return services.map((s) => s.uuid);
    } catch {
      return [];
    }
  };

  const refreshDevices = async () => {
    if (!supported) return;
    try {
      const permitted = await (navigator as any).bluetooth.getDevices();
      const info: DeviceInfo[] = [];
      for (const dev of permitted) {
        const services = await readServices(dev);
        info.push({ id: dev.id, name: dev.name || 'Unknown device', services });
      }
      setDevices(info);
    } catch (err) {
      const e = err as Error;
      setError(e.message || 'Failed to enumerate devices.');
    }
  };

  useEffect(() => {
    refreshDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRequest = async () => {
    if (!supported || busy) return;
    setBusy(true);
    setError('');
    const consent = window.confirm(
      'This application will request access to nearby Bluetooth devices. Continue?'
    );
    if (!consent) {
      setBusy(false);
      return;
    }
    try {
      await (navigator as any).bluetooth.requestDevice({ acceptAllDevices: true });
      await refreshDevices();
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotFoundError') {
        setError('No device selected.');
      } else if (e.name === 'NotAllowedError') {
        setError('Permission to access Bluetooth was denied.');
      } else {
        setError(e.message || 'Unable to request device.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="h-full w-full bg-black p-4 text-white">
      {!supported && (
        <p className="mb-4 text-sm text-yellow-400">
          Web Bluetooth is not supported in this browser.
        </p>
      )}
      <button
        onClick={handleRequest}
        disabled={!supported || busy}
        className="mb-4 rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
      >
        Add Device
      </button>
      {error && <FormError className="mt-0 mb-4">{error}</FormError>}
      <ul className="space-y-2 overflow-auto">
        {devices.map((d) => (
          <li key={d.id} className="border-b border-gray-700 pb-2">
            <p className="font-bold">{d.name}</p>
            {d.services.length > 0 ? (
              <ul className="ml-4 list-disc">
                {d.services.map((s) => (
                  <li key={s} className="text-sm">
                    {s}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400">No services</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default DeviceExplorer;

