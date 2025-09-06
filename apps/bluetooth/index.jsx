'use client';
import { useState } from 'react';

const MOCK_DEVICES = [
  {
    id: 1,
    name: 'Keyboard',
    pin: '1234',
    pairingMethod: 'pin',
    paired: false,
    connected: false,
    trusted: false,
  },
  {
    id: 2,
    name: 'Headphones',
    pin: '567890',
    pairingMethod: 'confirm',
    paired: false,
    connected: false,
    trusted: false,
  },
];

export default function BluetoothManager() {
  const [devices, setDevices] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [pairingDevice, setPairingDevice] = useState(null);
  const [pinInput, setPinInput] = useState('');
  const [pairingError, setPairingError] = useState('');

  const discoverDevices = () => {
    setScanning(true);
    setTimeout(() => {
      setDevices(MOCK_DEVICES);
      setScanning(false);
    }, 1000);
  };

  const startPairing = (device) => {
    setPairingDevice(device);
    setPinInput('');
    setPairingError('');
  };

  const finalizePair = () => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === pairingDevice.id
          ? { ...d, paired: true, connected: true }
          : d,
      ),
    );
    setPairingDevice(null);
  };

  const handlePair = () => {
    if (pairingDevice.pairingMethod === 'pin') {
      if (pinInput === pairingDevice.pin) {
        finalizePair();
      } else {
        setPairingError('Incorrect PIN');
      }
    } else {
      finalizePair();
    }
  };

  const connect = (device) => {
    if (!device.paired) {
      startPairing(device);
    } else {
      setDevices((prev) =>
        prev.map((d) =>
          d.id === device.id ? { ...d, connected: !d.connected } : d,
        ),
      );
    }
  };

  const trust = (device) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === device.id ? { ...d, trusted: !d.trusted } : d,
      ),
    );
  };

  const rename = (device) => {
    const newName = window.prompt('Rename device', device.name);
    if (newName) {
      setDevices((prev) =>
        prev.map((d) => (d.id === device.id ? { ...d, name: newName } : d)),
      );
    }
  };

  return (
    <div className="space-y-4 p-4">
      <button
        type="button"
        onClick={discoverDevices}
        disabled={scanning}
        className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
      >
        {scanning ? 'Scanning…' : 'Scan for devices'}
      </button>

      <ul className="space-y-2">
        {devices.map((device) => (
          <li key={device.id} className="rounded border p-2">
            <div className="flex items-center justify-between">
              <span>
                {device.name}
                {device.connected && ' (connected)'}
              </span>
              <div className="space-x-2">
                <button
                  type="button"
                  onClick={() => connect(device)}
                  className="rounded bg-green-600 px-2 py-1 text-white"
                >
                  {device.connected ? 'Disconnect' : 'Connect'}
                </button>
                <button
                  type="button"
                  onClick={() => trust(device)}
                  className="rounded bg-yellow-500 px-2 py-1 text-white"
                >
                  {device.trusted ? 'Untrust' : 'Trust'}
                </button>
                <button
                  type="button"
                  onClick={() => rename(device)}
                  className="rounded bg-gray-600 px-2 py-1 text-white"
                >
                  Rename
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {pairingDevice && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50" role="dialog">
          <div className="space-y-4 rounded bg-white p-4">
            <h2 className="text-lg font-bold">Pair with {pairingDevice.name}</h2>
            {pairingDevice.pairingMethod === 'pin' ? (
              <div className="space-y-2">
                <label className="block">
                  Enter PIN
                  <input
                    className="mt-1 w-full rounded border p-2"
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                  />
                </label>
                {pairingError && (
                  <p className="text-sm text-red-600">{pairingError}</p>
                )}
                <button
                  type="button"
                  onClick={handlePair}
                  className="rounded bg-blue-600 px-4 py-2 text-white"
                >
                  Pair
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p>Confirm code {pairingDevice.pin}</p>
                <button
                  type="button"
                  onClick={handlePair}
                  className="rounded bg-blue-600 px-4 py-2 text-white"
                >
                  Confirm
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setPairingDevice(null)}
              className="rounded bg-gray-300 px-4 py-2"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

