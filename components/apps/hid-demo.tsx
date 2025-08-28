import React, { useEffect, useState } from 'react';

interface HidLog {
  device: HIDDevice;
  reportId: number;
  data: string;
}

const HIDDemo: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'hid' in navigator;
  const [devices, setDevices] = useState<HIDDevice[]>([]);
  const [logs, setLogs] = useState<HidLog[]>([]);

  useEffect(() => {
    if (!supported) return;
    navigator.hid.getDevices().then(setDevices).catch(() => {});
  }, [supported]);

  const requestDevices = async () => {
    if (!supported) return;
    try {
      const requested = await navigator.hid.requestDevice({ filters: [] });
      setDevices((prev) => [...prev, ...requested]);
    } catch {
      // user cancelled
    }
  };

  const connect = async (device: HIDDevice) => {
    if (!device.opened) await device.open();
    device.addEventListener('inputreport', (e: HIDInputReportEvent) => {
      const bytes = new Uint8Array(e.data.buffer);
      const data = Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join(' ');
      setLogs((prev) => [{ device, reportId: e.reportId, data }, ...prev].slice(0, 20));
    });
  };

  return (
    <div className="h-full w-full bg-black p-4 text-white">
      {!supported && (
        <p className="mb-4 text-yellow-400">WebHID is not supported in this browser.</p>
      )}
      <button
        onClick={requestDevices}
        disabled={!supported}
        className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
      >
        Request Device
      </button>
      <ul className="my-4 max-h-48 space-y-2 overflow-auto">
        {devices.map((d) => (
          <li
            key={`${d.vendorId}-${d.productId}-${d.productName}`}
            className="flex items-center justify-between border-b border-gray-700 pb-1"
          >
            <span>
              {d.productName || 'Unknown'} ({d.vendorId.toString(16)}:{' '}
              {d.productId.toString(16)})
            </span>
            <button
              onClick={() => connect(d)}
              className="rounded bg-gray-700 px-2 py-0.5 text-xs"
            >
              Listen
            </button>
          </li>
        ))}
      </ul>
      {logs.length > 0 && (
        <div>
          <p className="mb-2 font-bold">Last Input Report</p>
          <pre className="max-h-40 overflow-auto rounded bg-gray-800 p-2 text-xs">
            {`Device: ${logs[0].device.productName || 'Unknown'}\nReport ${logs[0].reportId}: ${logs[0].data}`}
          </pre>
        </div>
      )}
    </div>
  );
};

export default HIDDemo;
export const displayHidDemo = () => <HIDDemo />;
