import React, { useState, useMemo } from "react";

const VENDORS = [
  { name: "Apple", oui: "00:1A:7D" },
  { name: "Samsung", oui: "00:1B:63" },
  { name: "Microsoft", oui: "00:50:F2" },
  { name: "Google", oui: "3C:5A:B4" },
  { name: "Dell", oui: "00:14:22" },
];

const DEVICE_NAMES = [
  "Phone",
  "Laptop",
  "Headphones",
  "Keyboard",
  "Mouse",
  "Tablet",
];

const generateMockDevices = (count = 8) =>
  Array.from({ length: count }, (_, i) => {
    const vendor = VENDORS[Math.floor(Math.random() * VENDORS.length)];
    return {
      id: `${vendor.oui}-${i}`,
      name: `${vendor.name} ${
        DEVICE_NAMES[Math.floor(Math.random() * DEVICE_NAMES.length)]
      }`,
      rssi: Math.floor(Math.random() * 70) - 90, // -90 to -20
      vendor: vendor.name,
      oui: vendor.oui,
    };
  });

const BluetoothApp = () => {
  const [devices, setDevices] = useState([]);
  const [minRssi, setMinRssi] = useState(-100);
  const [manufacturer, setManufacturer] = useState("");

  const scan = () => setDevices(generateMockDevices());
  const filteredDevices = useMemo(
    () =>
      devices.filter(
        (d) =>
          d.rssi >= minRssi &&
          d.vendor.toLowerCase().includes(manufacturer.toLowerCase())
      ),
    [devices, minRssi, manufacturer]
  );

  const exportCSV = () => {
    const headers = ["Name", "RSSI", "Manufacturer", "OUI"];
    const rows = filteredDevices.map((d) =>
      [d.name, d.rssi, d.vendor, d.oui].join(",")
    );
    const csvContent = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bluetooth_devices.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={scan} className="px-4 py-2 bg-blue-600 rounded">
          Generate Devices
        </button>
        <input
          type="number"
          value={minRssi}
          onChange={(e) => setMinRssi(parseInt(e.target.value) || -100)}
          placeholder="Min RSSI"
          className="px-2 py-1 bg-gray-800 rounded"
        />
        <input
          type="text"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
          placeholder="Manufacturer"
          className="px-2 py-1 bg-gray-800 rounded"
        />
        <button onClick={exportCSV} className="px-4 py-2 bg-green-600 rounded">
          Export CSV
        </button>
      </div>
      <ul>
        {filteredDevices.map((device) => (
          <li key={device.id} className="mb-2 border-b border-gray-700 pb-2">
            <div className="font-semibold">{device.name}</div>
            <div className="text-sm">
              RSSI: {device.rssi} dBm | Vendor: {device.vendor} | OUI: {device.oui}
            </div>
          </li>
        ))}
      </ul>
      {filteredDevices.length === 0 && (
        <div>No devices found. Click generate to populate.</div>
      )}

      <div className="mt-6 p-4 bg-gray-800 rounded">
        <h2 className="text-lg mb-2">Bluetooth Security Hardening</h2>
        <ul className="list-disc list-inside text-blue-400">
          <li>
            <a
              href="https://www.bluetooth.com/learn-about-bluetooth/tech-blog/bluetooth-security/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              Bluetooth Security Best Practices
            </a>
          </li>
          <li>
            <a
              href="https://owasp.org/www-community/attacks/Bluetooth_Low_Energy_Security"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              OWASP BLE Security Guide
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default BluetoothApp;

export const displayBluetooth = () => <BluetoothApp />;

