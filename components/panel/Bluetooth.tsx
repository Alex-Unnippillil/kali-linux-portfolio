'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import ToggleSwitch from '../ToggleSwitch';

interface Adapter {
  id: string;
  name: string;
  autostart: boolean;
}

interface Device {
  id: string;
  name: string;
  paired: boolean;
  trusted: boolean;
}

const BluetoothPanel: React.FC = () => {
  const [adapters, setAdapters] = useState<Adapter[]>([
    { id: 'hci0', name: 'Internal Adapter', autostart: true },
  ]);

  const [devices, setDevices] = useState<Device[]>([
    { id: 'kbd', name: 'Logitech Keyboard', paired: true, trusted: false },
    { id: 'spk', name: 'BT Speaker', paired: false, trusted: false },
  ]);

  const toggleAutostart = (id: string, value: boolean) => {
    setAdapters((prev) =>
      prev.map((a) => (a.id === id ? { ...a, autostart: value } : a)),
    );
  };

  const togglePair = (id: string) => {
    setDevices((prev) =>
      prev.map((d) =>
        d.id === id ? { ...d, paired: !d.paired, trusted: d.trusted && !d.paired } : d,
      ),
    );
  };

  const toggleTrust = (id: string) => {
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, trusted: !d.trusted } : d)),
    );
  };

  const removeDevice = (id: string) => {
    setDevices((prev) => prev.filter((d) => d.id !== id));
  };

  return (
    <div className="p-4 text-sm text-white">
      <h2 className="mb-2 font-bold">Adapters</h2>
      <ul className="mb-4 space-y-2">
        {adapters.map((a) => (
          <li
            key={a.id}
            className="flex items-center justify-between rounded border border-gray-700 p-2"
          >
            <span>{a.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs">Autostart</span>
              <ToggleSwitch
                checked={a.autostart}
                onChange={(checked) => toggleAutostart(a.id, checked)}
                ariaLabel={`Autostart ${a.name}`}
              />
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mb-2 font-bold">Paired Devices</h2>
      <ul className="space-y-2">
        {devices.map((d) => (
          <li
            key={d.id}
            className="rounded border border-gray-700 p-2"
          >
            <div className="flex items-center justify-between">
              <span>{d.name}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => togglePair(d.id)}
                  className="rounded bg-blue-600 px-2 py-1 text-xs"
                >
                  {d.paired ? 'Unpair' : 'Pair'}
                </button>
                <button
                  onClick={() => toggleTrust(d.id)}
                  className="rounded bg-success px-2 py-1 text-xs"
                >
                  {d.trusted ? 'Untrust' : 'Trust'}
                </button>
                <button
                  onClick={() => removeDevice(d.id)}
                  className="rounded bg-danger px-2 py-1 text-xs"
                >
                  Remove
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 text-right">
        <Link href="/apps/bluetooth" className="text-ubt-blue underline">
          Open Bluetooth Manager…
        </Link>
      </div>
    </div>
  );
};

export default BluetoothPanel;
