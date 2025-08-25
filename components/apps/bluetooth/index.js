import React, { useState } from 'react';

const BluetoothApp = () => {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [demo, setDemo] = useState(false);

  const scan = async () => {
    setError('');
    if (!navigator.bluetooth) {
      setDemo(true);
      setError('Web Bluetooth API is not supported in this browser. Showing demo devices.');
      setDevices([
        { id: 'demo-1', name: 'Demo Device 1' },
        { id: 'demo-2', name: 'Demo Device 2' },
      ]);
      return;
    }
    setDemo(false);
    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
      });
      setDevices((prev) => {
        if (prev.find((d) => d.id === device.id)) return prev;
        return [...prev, device];
      });
    } catch (e) {
      setError(e.message || 'Failed to scan for devices');
    }
  };

  const connect = async (device) => {
    try {
      if (!device.gatt.connected) {
        await device.gatt.connect();
        setDevices([...devices]);
      }
    } catch (e) {
      setError(e.message || 'Failed to connect');
    }
  };

  const disconnect = (device) => {
    try {
      if (device.gatt.connected) {
        device.gatt.disconnect();
        setDevices([...devices]);
      }
    } catch (e) {
      setError(e.message || 'Failed to disconnect');
    }
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <div className="mb-4">
        <button onClick={scan} className="px-4 py-2 bg-blue-600 rounded">
          Scan for Devices
        </button>
      </div>
      {error && <div className="mb-4 text-red-400">{error}</div>}
      <ul>
        {devices.map((device, idx) => (
          <li
            key={device.id || idx}
            className="mb-2 flex items-center justify-between"
          >
            <span>{device.name || 'Unnamed device'}</span>
            {demo ? (
              <span className="text-gray-400">Read-only</span>
            ) : device.gatt && device.gatt.connected ? (
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
          </li>
        ))}
      </ul>
      {devices.length === 0 && (
        <div>No devices found. Click scan to search.</div>
      )}
    </div>
  );
};

export default BluetoothApp;

export const displayBluetooth = () => {
  return <BluetoothApp />;
};

