import { useState } from "react";

interface Device {
  label: string;
  device: string;
  mount: string;
}

const devices: Device[] = [
  { label: "USB Drive (/dev/sdb1)", device: "/dev/sdb1", mount: "/media/sdb1" },
  { label: "USB Drive (/dev/sdc1)", device: "/dev/sdc1", mount: "/media/sdc1" },
];

export default function RemovableMedia() {
  const [command, setCommand] = useState(
    "udisksctl mount -b %d && xdg-open %m",
  );
  const [selected, setSelected] = useState<Device>(devices[0]);

  const preview = command
    .replace(/%d/g, selected.device)
    .replace(/%m/g, selected.mount);

  return (
    <div className="p-4 text-ubt-grey bg-ub-cool-grey min-h-screen">
      <h1 className="text-xl mb-4">Removable Media</h1>
      <p className="mb-4 text-sm">
        Example:{" "}
        <code className="bg-gray-800 px-1 py-0.5 rounded">
          udisksctl mount -b %d && xdg-open %m
        </code>
      </p>
      <label className="block mb-4">
        <span className="block mb-1">Command</span>
        <input
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          className="w-full p-2 rounded text-black"
          aria-label="command-template"
        />
      </label>
      <label className="block mb-4">
        <span className="block mb-1">Device</span>
        <select
          value={selected.device}
          onChange={(e) =>
            setSelected(
              devices.find((d) => d.device === e.target.value) || devices[0],
            )
          }
          className="w-full p-2 rounded text-black"
          aria-label="device-selector"
        >
          {devices.map((d) => (
            <option key={d.device} value={d.device}>
              {d.label}
            </option>
          ))}
        </select>
      </label>
      <div>
        <p className="mb-1">Preview:</p>
        <pre
          data-testid="command-preview"
          className="bg-black text-green-400 p-2 overflow-auto font-mono"
        >
          {preview}
        </pre>
      </div>
    </div>
  );
}
