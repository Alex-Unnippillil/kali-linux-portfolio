import React, { useState } from 'react';
import FormError from '../ui/FormError';

interface CharacteristicData {
  uuid: string;
  value: string;
}

interface ServiceData {
  uuid: string;
  characteristics: CharacteristicData[];
}

const MAX_RETRIES = 3;

const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

const BleSensor: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const [deviceName, setDeviceName] = useState('');
  const [services, setServices] = useState<ServiceData[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

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
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information'],
      });

      setDeviceName(device.name || 'Unknown device');

      const server = await connectWithRetry(device);

      device.addEventListener('gattserverdisconnected', () =>
        setError('Device disconnected.')
      );

      const primServices = await server.getPrimaryServices();
      const serviceData: ServiceData[] = [];

      for (const service of primServices) {
        const chars = await service.getCharacteristics();
        const charData = await Promise.all(
          chars.map(async (char) => {
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

      {error && <FormError className="mt-0 mb-4">{error}</FormError>}

      {deviceName && <p className="mb-2">Connected to: {deviceName}</p>}

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
    </div>
  );
};

export default BleSensor;
export const displayBleSensor = () => <BleSensor />;

