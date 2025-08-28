import React, { useEffect, useState } from 'react';
import FormError from '../../ui/FormError';

interface ServiceInfo {
  uuid: string;
  characteristics: string[];
}

const mockData: ServiceInfo[] = [
  {
    uuid: 'battery_service',
    characteristics: ['battery_level'],
  },
  {
    uuid: 'device_information',
    characteristics: ['manufacturer_name_string', 'model_number_string'],
  },
];

const BluetoothApp: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'bluetooth' in navigator;
  const [useMock, setUseMock] = useState(!supported);
  const [services, setServices] = useState<ServiceInfo[]>(!supported ? mockData : []);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('');
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (!supported) {
      setServices(mockData);
    }
  }, [supported]);

  const parseFilters = (): BluetoothLEScanFilter[] | null => {
    const services = filter
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return services.length ? [{ services: services as BluetoothServiceUUID[] }] : null;
  };

  const handleConnect = async () => {
    if (!supported) return;
    const filters = parseFilters();
    if (!filters) {
      setError('Please enter at least one service UUID.');
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({ filters });
      device.addEventListener('gattserverdisconnected', () => {
        setError('Device disconnected.');
      });
      const server = await device.gatt!.connect();
      const primServices = await server.getPrimaryServices();
      const serviceData = await Promise.all(
        primServices.map(async (service) => {
          const chars = await service.getCharacteristics();
          return {
            uuid: service.uuid,
            characteristics: chars.map((c) => c.uuid),
          } as ServiceInfo;
        })
      );
      setServices(serviceData);
      setError('');
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotFoundError') {
        setError('No devices found matching the filters.');
      } else if (e.name === 'NotAllowedError') {
        setError('Permission to access Bluetooth was denied.');
      } else {
        setError(e.message || 'An unknown error occurred.');
      }
    }
  };

  const toggleMock = () => {
    if (!useMock) {
      setServices(mockData);
    } else {
      setServices([]);
    }
    setUseMock(!useMock);
  };

  return (
    <div className="relative h-full w-full bg-black p-4 text-white">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={handleConnect}
          disabled={useMock || !supported}
          className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
        >
          Scan for Device
        </button>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useMock}
            onChange={toggleMock}
            disabled={!supported}
          />
          Use Mock Data
        </label>
        <button
          onClick={() => setShowHelp((v) => !v)}
          className="rounded bg-gray-700 px-2 py-1 text-sm"
          aria-label="Help"
        >
          ?
        </button>
        {showHelp && (
          <div className="absolute left-0 top-12 z-10 w-64 rounded bg-gray-700 p-2 text-sm">
            <p className="mb-2">
              Grant Bluetooth permission when prompted. Only central-role BLE devices are
              supported.
            </p>
            <p>Some browsers may not support Web Bluetooth.</p>
          </div>
        )}
      </div>
      {!supported && (
        <p className="mb-4 text-sm text-yellow-400">
          Web Bluetooth is not supported. Using demo devices.
        </p>
      )}
      <div className="mb-4">
        <input
          type="text"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Service UUIDs (comma-separated)"
          disabled={useMock}
          className="w-full rounded bg-gray-800 p-2 text-white disabled:opacity-50"
        />
      </div>
      {error && <FormError className="mb-4 mt-0">{error}</FormError>}
      <ul className="space-y-2 overflow-auto">
        {services.map((service) => (
          <li key={service.uuid} className="border-b border-gray-700 pb-2">
            <p className="font-bold">Service: {service.uuid}</p>
            <ul className="ml-4 list-disc">
              {service.characteristics.map((char) => (
                <li key={char}>Characteristic: {char}</li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default BluetoothApp;
export const displayBluetooth = () => <BluetoothApp />;
