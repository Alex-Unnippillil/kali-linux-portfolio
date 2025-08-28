import React, { useEffect, useState } from 'react';
import FormError from '../../ui/FormError';

const mockData = [
  {
    uuid: 'battery_service',
    characteristics: [
      { uuid: 'battery_level', properties: { read: true, notify: true }, value: '95' },
    ],
  },
  {
    uuid: 'device_information',
    characteristics: [
      { uuid: 'manufacturer_name_string', properties: { read: true }, value: 'Mock Manufacturer' },
      {
        uuid: 'model_number_string',
        properties: { read: true, write: true },
        value: 'Model 1',
      },
    ],
  },
];

const BluetoothApp = () => {
  const [supported] = useState(typeof navigator !== 'undefined' && 'bluetooth' in navigator);
  const [useMock, setUseMock] = useState(!supported);
  const [services, setServices] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (useMock) {
      setServices(
        mockData.map((service) => ({
          uuid: service.uuid,
          characteristics: service.characteristics.map((c) => ({
            uuid: c.uuid,
            characteristic: null,
            properties: c.properties,
            value: c.value || '',
            writeValue: '',
            notifying: false,
            listener: null,
            interval: null,
          })),
        }))
      );
    } else {
      setServices((prev) => {
        prev.forEach((s) =>
          s.characteristics.forEach((c) => {
            if (c.interval) clearInterval(c.interval);
            if (c.listener && c.characteristic) {
              c.characteristic.removeEventListener('characteristicvaluechanged', c.listener);
            }
          })
        );
        return [];
      });
    }
  }, [useMock]);

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
            characteristics: chars.map((c) => ({
              uuid: c.uuid,
              characteristic: c,
              properties: {
                read: c.properties.read,
                write: c.properties.write || c.properties.writeWithoutResponse,
                notify: c.properties.notify,
              },
              value: '',
              writeValue: '',
              notifying: false,
              listener: null,
              interval: null,
            })),
          };
        })
      );
      setServices(serviceData);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const getChar = (sUuid, cUuid) =>
    services.find((s) => s.uuid === sUuid)?.characteristics.find((c) => c.uuid === cUuid);

  const updateChar = (sUuid, cUuid, changes) => {
    setServices((prev) =>
      prev.map((s) =>
        s.uuid === sUuid
          ? {
              ...s,
              characteristics: s.characteristics.map((c) =>
                c.uuid === cUuid ? { ...c, ...changes } : c
              ),
            }
          : s
      )
    );
  };

  const handleRead = async (sUuid, cUuid) => {
    try {
      const char = getChar(sUuid, cUuid);
      if (!char) return;
      if (useMock || !char.characteristic) {
        updateChar(sUuid, cUuid, { value: char.value });
        return;
      }
      const value = await char.characteristic.readValue();
      const decoded = new TextDecoder().decode(value);
      updateChar(sUuid, cUuid, { value: decoded });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (sUuid, cUuid, val) => {
    updateChar(sUuid, cUuid, { writeValue: val });
  };

  const handleWrite = async (sUuid, cUuid) => {
    try {
      const char = getChar(sUuid, cUuid);
      if (!char) return;
      if (useMock || !char.characteristic) {
        updateChar(sUuid, cUuid, { value: char.writeValue });
        return;
      }
      await char.characteristic.writeValue(new TextEncoder().encode(char.writeValue));
      updateChar(sUuid, cUuid, { value: char.writeValue });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleNotify = async (sUuid, cUuid) => {
    const char = getChar(sUuid, cUuid);
    if (!char) return;
    try {
      if (useMock || !char.characteristic) {
        if (char.notifying) {
          clearInterval(char.interval);
          updateChar(sUuid, cUuid, { notifying: false, interval: null });
        } else {
          const interval = setInterval(() => {
            const random = Math.floor(Math.random() * 100).toString();
            updateChar(sUuid, cUuid, { value: random });
          }, 2000);
          updateChar(sUuid, cUuid, { notifying: true, interval });
        }
        return;
      }
      if (char.notifying) {
        await char.characteristic.stopNotifications();
        char.characteristic.removeEventListener('characteristicvaluechanged', char.listener);
        updateChar(sUuid, cUuid, { notifying: false, listener: null });
      } else {
        const listener = (event) => {
          const val = new TextDecoder().decode(event.target.value);
          updateChar(sUuid, cUuid, { value: val });
        };
        await char.characteristic.startNotifications();
        char.characteristic.addEventListener('characteristicvaluechanged', listener);
        updateChar(sUuid, cUuid, { notifying: true, listener });
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="h-full w-full bg-black p-4 text-white">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={handleConnect}
          disabled={useMock || !supported}
          className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
        >
          Scan for Device
        </button>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={useMock} onChange={() => setUseMock((m) => !m)} />
          Use Mock Data
        </label>
      </div>
      {!supported && (
        <p className="mb-4 text-yellow-400">
          Web Bluetooth not supported. {useMock ? 'Using mock data.' : 'Enable mock mode to explore.'}
        </p>
      )}
      {error && <FormError className="mb-4 mt-0">{error}</FormError>}
      <ul className="space-y-2 overflow-auto">
        {services.map((service) => (
          <li key={service.uuid} className="border-b border-gray-700 pb-2">
            <p className="font-bold">Service: {service.uuid}</p>
            <ul className="ml-4 list-disc">
              {service.characteristics.map((char) => (
                <li key={char.uuid} className="mt-1">
                  <p>Characteristic: {char.uuid}</p>
                  <div className="ml-4 flex flex-wrap items-center gap-2">
                    {char.properties.read && (
                      <button
                        onClick={() => handleRead(service.uuid, char.uuid)}
                        className="rounded bg-gray-700 px-2 py-1"
                      >
                        Read
                      </button>
                    )}
                    {char.properties.write && (
                      <>
                        <input
                          type="text"
                          value={char.writeValue}
                          onChange={(e) => handleInputChange(service.uuid, char.uuid, e.target.value)}
                          className="w-24 rounded bg-gray-800 px-1 py-0.5 text-white"
                        />
                        <button
                          onClick={() => handleWrite(service.uuid, char.uuid)}
                          className="rounded bg-gray-700 px-2 py-1"
                        >
                          Write
                        </button>
                      </>
                    )}
                    {char.properties.notify && (
                      <button
                        onClick={() => handleNotify(service.uuid, char.uuid)}
                        className="rounded bg-gray-700 px-2 py-1"
                      >
                        {char.notifying ? 'Stop Notify' : 'Start Notify'}
                      </button>
                    )}
                    {char.value && <span className="ml-2">Value: {char.value}</span>}
                  </div>
                </li>
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
