import React, { useState } from 'react';

const mockData = [
  {
    uuid: 'battery_service',
    characteristics: ['battery_level'],
  },
  {
    uuid: 'device_information',
    characteristics: ['manufacturer_name_string', 'model_number_string'],
  },
];

const BluetoothApp = () => {
  const [supported] = useState(typeof navigator !== 'undefined' && 'bluetooth' in navigator);
  const [useMock, setUseMock] = useState(false);
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');

  const handleConnect = async () => {
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: ['battery_service'] }],
      });
      const server = await device.gatt.connect();
      const primServices = await server.getPrimaryServices();
      const serviceData = await Promise.all(
        primServices.map(async (service) => {
          const chars = await service.getCharacteristics();
          return {
            uuid: service.uuid,
            characteristics: chars.map((c) => c.uuid),
          };
        })
      );
      setServices(serviceData);
      setError('');
    } catch (err) {
      setError(err.message);
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

  if (!supported) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black p-4 text-center text-white">
        <p>
          Your browser does not support Web Bluetooth. See the{' '}
          <a
            href="https://developer.mozilla.org/docs/Web/API/Web_Bluetooth_API"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-400"
          >
            documentation
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-black p-4 text-white">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={handleConnect}
          disabled={useMock}
          className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
        >
          Scan for Device
        </button>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useMock} onChange={toggleMock} />
          Use Mock Data
        </label>
      </div>
      {error && <p className="mb-4 text-red-400">{error}</p>}
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
