import React, { useState } from "react";
import FormError from "../../ui/FormError";

interface DeviceInfo {
  address: string;
  name: string;
  rssi: number;
  class: string;
}

const BluetoothApp: React.FC = () => {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [error, setError] = useState("");
  const [rssiFilter, setRssiFilter] = useState("");
  const [search, setSearch] = useState("");
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [pairingDevice, setPairingDevice] = useState<DeviceInfo | null>(null);
  const [pairedDevice, setPairedDevice] = useState("");

  const loadData = async () => {
    try {
      const res = await fetch("/demo-data/bluetooth/scan.json");
      const data: DeviceInfo[] = await res.json();
      setDevices(data);
      setError("");
    } catch {
      setError("Failed to load scan data.");
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

  const grouped = filtered.reduce<Record<string, DeviceInfo[]>>((acc, d) => {
    const type = d.class || "Unknown";
    (acc[type] ||= []).push(d);
    return acc;
  }, {});

  return (
    <div className="relative h-full w-full bg-black p-4 text-white">
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
            <ul className="space-y-2">
              {list.map((d) => (
                <li key={d.address} className="border-b border-gray-700 pb-2">
                  <p className="font-bold">{d.name || d.address}</p>
                  <p className="text-sm">
                    RSSI: {d.rssi} | Class: {d.class}
                  </p>
                  <button
                    onClick={() => setPairingDevice(d)}
                    className="mt-2 rounded bg-gray-700 px-2 py-1 text-sm"
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
                  setError("Permission denied.");
                }}
                className="rounded bg-gray-600 px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPermissionGranted(true);
                  setShowPermissionModal(false);
                  loadData();
                }}
                className="rounded bg-blue-600 px-2 py-1"
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
                className="rounded bg-gray-600 px-2 py-1"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setPairedDevice(pairingDevice.name || pairingDevice.address);
                  setPairingDevice(null);
                }}
                className="rounded bg-blue-600 px-2 py-1"
              >
                Pair
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BluetoothApp;
export const displayBluetooth = () => <BluetoothApp />;
