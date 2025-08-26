import React, { useCallback, useEffect, useState } from 'react';

const BluetoothApp = () => {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');

  const updateDevices = useCallback(() => {
    // Trigger a re-render to update connection status
    setDevices((prev) => [...prev]);
  }, []);

  const addListeners = (device) => {
    device.addEventListener('gattserverdisconnected', updateDevices);
    device.addEventListener('gattserverconnected', updateDevices);
  };

  useEffect(() => {
    const fetchPairedDevices = async () => {
      setError('');
      if (!navigator.bluetooth) {
        setError('Web Bluetooth API is not supported in this browser.');
        return;
      }
      try {
        const paired = await navigator.bluetooth.getDevices();
        paired.forEach(addListeners);
        setDevices(paired);
      } catch (e) {
        setError(e.message || 'Failed to get paired devices');
      }
    };
    fetchPairedDevices();
  }, [updateDevices]);

  const pair = async () => {
    setError('');
    if (!navigator.bluetooth) {
      setError('Web Bluetooth API is not supported in this browser.');
      return;
    }
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
      });
      addListeners(device);
      setDevices((prev) => {
        if (prev.find((d) => d.id === device.id)) return prev;
        return [...prev, device];
      });
    } catch (e) {
      setError(e.message || 'Failed to pair device');
    }
  };

  const connect = async (device) => {
    try {
      if (!device.gatt.connected) {
        await device.gatt.connect();
        updateDevices();
      }
    } catch (e) {
      setError(e.message || 'Failed to connect');
    }
  };

  const disconnect = (device) => {
    try {
      if (device.gatt.connected) {
        device.gatt.disconnect();
        updateDevices();
      }
    } catch (e) {
      setError(e.message || 'Failed to disconnect');
    }
  };

  const remove = (device) => {
    try {
      device.removeEventListener('gattserverdisconnected', updateDevices);
      device.removeEventListener('gattserverconnected', updateDevices);
      if (device.gatt.connected) {
        device.gatt.disconnect();
      }
    } catch (e) {
      // ignore errors when removing
    }
    setDevices((prev) => prev.filter((d) => d !== device));
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <div className="mb-4 space-x-2">
        <button onClick={pair} className="px-4 py-2 bg-blue-600 rounded">
          Pair New Device
        </button>
      </div>
      {error && <div className="mb-4 text-red-400">{error}</div>}
      <ul>
        {devices.map((device, idx) => (
          <li
            key={device.id || idx}
            className="mb-2 flex items-center justify-between"
          >
            <span>
              {device.name || 'Unnamed device'} -{' '}
              {device.gatt && device.gatt.connected ? 'Connected' : 'Disconnected'}
            </span>
            <div className="space-x-2">
              {device.gatt && device.gatt.connected ? (
                <button
                  onClick={() => disconnect(device)}
                  className="px-2 py-1 bg-red-600 rounded"
                >
                  Disconnect
                </button>
              ) : (
                <button
                  onClick={() => connect(device)}
                  className="px-2 py-1 bg-green-600 rounded"
                >
                  Connect
                </button>
              )}
              <button
                onClick={() => remove(device)}
                className="px-2 py-1 bg-gray-600 rounded"
              >
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>
      {devices.length === 0 && (
        <div>No devices found. Click pair to add new devices.</div>
      )}
    </div>
  );
};

export default BluetoothApp;

export const displayBluetooth = () => {
  return <BluetoothApp />;
};

