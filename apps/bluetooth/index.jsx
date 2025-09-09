'use client';
import React, { useEffect, useState } from 'react';
import FormError from '@/components/ui/FormError';

const SignalBars = ({ rssi }) => {
  const level =
    rssi >= -60 ? 4 : rssi >= -70 ? 3 : rssi >= -80 ? 2 : rssi >= -90 ? 1 : 0;
  const heights = ['h-[4px]', 'h-[8px]', 'h-[12px]', 'h-[16px]'];
  return (
    <div className="mt-1.5 flex h-4 items-end gap-0.5">
      {heights.map((h, i) => (
        <div
          key={i}
          className={`w-1 ${h} ${level > i ? 'bg-green-500' : 'bg-gray-600'}`}
        />
      ))}
    </div>
  );
};

export default function BluetoothApp() {
  const [devices, setDevices] = useState([]);
  const [error, setError] = useState('');
  const [rssiFilter, setRssiFilter] = useState('');
  const [search, setSearch] = useState('');
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pairingDevice, setPairingDevice] = useState(null);
  const [pairedDevice, setPairedDevice] = useState('');
  const [knownDevices, setKnownDevices] = useState([]);

  useEffect(() => {
    const loadKnown = async () => {
      try {
        const res = await fetch('/bluetooth/known_devices.json');
        const data = await res.json();
        setKnownDevices(data);
      } catch {
        // ignore failures loading known devices
      }
    };
    loadKnown();
  }, []);

  const loadData = async () => {
    try {
      const res = await fetch('/demo-data/bluetooth/scan.json');
      const data = await res.json();
      setDevices(data);
      setError('');
      const nearbyKnown = data.find((d) => knownDevices.includes(d.address));
      if (nearbyKnown) setPairingDevice(nearbyKnown);
    } catch {
      setError('Failed to load scan data.');
    }
  };

  const handleScan = () => {
    if (!permissionGranted) {
      setShowPermissionModal(true);
    } else {
      loadData();
    }
  };

  const filtered = devices.filter((d) => {
    const rssiOk = !rssiFilter || d.rssi >= Number(rssiFilter);
    const searchLower = search.toLowerCase();
    const searchOk =
      !search ||
      d.name.toLowerCase().includes(searchLower) ||
      d.address.toLowerCase().includes(searchLower) ||
      d.class.toLowerCase().includes(searchLower);
    return rssiOk && searchOk;
  });

  const grouped = filtered.reduce((acc, d) => {
    const type = d.class || 'Unknown';
    (acc[type] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div className="relative h-full w-full bg-black p-4 text-white">
      <div className="mb-4 flex items-center gap-2">
        <span
          className={`h-3 w-3 rounded-full ${pairedDevice ? 'bg-green-500' : 'bg-red-500'}`}
        ></span>
        <span className="text-sm">{pairedDevice ? 'Paired' : 'Not paired'}</span>
      </div>
      <div className="mb-4 flex items-center gap-4">
        <button onClick={handleScan} className="rounded bg-blue-600 px-3 py-1">
          Scan for Devices
        </button>
      </div>
      <div className="mb-4 flex gap-2">
        <input
          type="number"
          placeholder="Min RSSI"
          value={rssiFilter}
          onChange={(e) => setRssiFilter(e.target.value)}
          className="w-1/3 rounded bg-gray-800 p-2 text-white"
        />
        <input
          type="text"
          placeholder="Search devices"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-2/3 rounded bg-gray-800 p-2 text-white"
        />
      </div>
      {error && <FormError className="mb-4 mt-0">{error}</FormError>}
      {pairedDevice && <p className="mb-2">Paired with: {pairedDevice}</p>}
      <div className="space-y-4 overflow-auto">
        {Object.entries(grouped).map(([type, list]) => (
          <div key={type}>
            <h3 className="mb-2 font-bold">{type}</h3>
            <ul className="grid grid-cols-2 gap-1.5">
              {list.map((d) => (
                <li
                  key={d.address}
                  className="flex flex-col items-center rounded bg-gray-800 p-1.5"
                >
                  <img
                    src="/themes/Yaru/status/emblem-system-symbolic.svg"
                    alt=""
                    className="h-16 w-16"
                  />
                  <p className="mt-1.5 text-center text-sm font-bold">
                    {d.name || d.address}
                  </p>
                  <SignalBars rssi={d.rssi} />
                  <button
                    onClick={() => setPairingDevice(d)}
                    className="mt-1.5 w-full rounded bg-gray-700 px-2 py-1 text-sm"
                  >
                    Pair
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {showPermissionModal && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="w-64 rounded bg-gray-800 p-4 text-center">
            <p className="mb-4">Allow access to Bluetooth devices?</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPermissionModal(false);
                  setError('Permission denied.');
                }}
                className="w-[90px] rounded bg-gray-600 px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPermissionGranted(true);
                  setShowPermissionModal(false);
                  loadData();
                }}
                className="w-[90px] rounded bg-blue-600 px-2 py-1"
              >
                Allow
              </button>
            </div>
          </div>
        </div>
      )}
      {pairingDevice && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="w-64 rounded bg-gray-800 p-4 text-center">
            <p className="mb-4">
              Pair with {pairingDevice.name || pairingDevice.address}?
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPairingDevice(null)}
                className="w-[90px] rounded bg-gray-600 px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPairedDevice(pairingDevice.name || pairingDevice.address);
                  setPairingDevice(null);
                }}
                className="w-[90px] rounded bg-blue-600 px-2 py-1"
              >
                Pair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

