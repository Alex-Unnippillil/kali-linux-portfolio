import React, { useState } from 'react';
import FormError from '../ui/FormError';

// These types are intentionally loose as the Web Bluetooth API is
// unavailable in the test environment and has limited TypeScript
// definitions without DOM lib support in this project.
type BluetoothDevice = any;
type BluetoothRemoteGATTServer = any;

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
  const [device, setDevice] = useState<BluetoothDevice | null>(null);

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
      const reqDevice = await (navigator as any).bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: ['battery_service', 'device_information'],
      });

      setDevice(reqDevice);
      setDeviceName(reqDevice.name || 'Unknown device');

      const server = await connectWithRetry(reqDevice);

      const onDisconnect = () => {
        setError('Device disconnected.');
        setDevice(null);
        setDeviceName('');
        setServices([]);
      };
      reqDevice.addEventListener('gattserverdisconnected', onDisconnect);

      const primServices = await server.getPrimaryServices();
      const serviceData: ServiceData[] = [];

      for (const service of primServices) {
        const chars = await service.getCharacteristics();
        const charData: CharacteristicData[] = [];
        for (const char of chars) {
          try {
            const val = await char.readValue();
            let value: string;
            // Battery level characteristic returns a single unsigned byte (0-100)
            if (char.uuid.toLowerCase().includes('2a19')) {
              value = `${val.getUint8(0)}%`;
            } else {
              const decoder = new TextDecoder();
              value = decoder.decode(val.buffer);
            }
            charData.push({ uuid: char.uuid, value });
          } catch {
            charData.push({ uuid: char.uuid, value: '[unreadable]' });
          }
        }
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

  const handleDisconnect = () => {
    try {
      if (device?.gatt?.connected) device.gatt.disconnect();
    } catch {
      // ignore disconnect errors
    }
    setDevice(null);
    setDeviceName('');
    setServices([]);
  };

  const handleRescan = async () => {
    handleDisconnect();
    await handleScan();
  };

  return (
    <div className="h-full w-full bg-black p-4 text-white">
      {!supported && (
        <p className="mb-4 text-sm text-yellow-400">
          Web Bluetooth is not supported in this browser.
        </p>
      )}

      <div className="mb-4 space-x-2">
        <button
          onClick={device ? handleDisconnect : handleScan}
          disabled={!supported || busy}
          className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
        >
          {device ? 'Disconnect' : 'Scan for Devices'}
        </button>
        {device && (
          <button
            onClick={handleRescan}
            disabled={busy}
            className="rounded bg-gray-700 px-3 py-1 disabled:opacity-50"
          >
            Rescan
          </button>
        )}
      </div>

      {error && <FormError className="mt-0 mb-4">{error}</FormError>}

      {deviceName && <p className="mb-2">Connected to: {deviceName}</p>}

      <ul className="space-y-2 overflow-auto">
        {services.map((service) => (
          <li key={service.uuid} className="border-b border-gray-700 pb-2">
            <details open>
              <summary className="cursor-pointer font-bold">
                Service: {service.uuid}
              </summary>
              <ul className="ml-4 list-disc">
                {service.characteristics.map((char) => (
                  <li key={char.uuid}>
                    {char.uuid}: {char.value}
                  </li>
                ))}
              </ul>
            </details>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BleSensor;
export const displayBleSensor = () => <BleSensor />;

