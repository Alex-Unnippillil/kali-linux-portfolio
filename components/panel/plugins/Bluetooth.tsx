import { isBrowser } from '@/utils/env';
import Image from 'next/image';
import { useState, useEffect } from 'react';

const DEFAULT_DEVICES = ['Keyboard', 'Mouse', 'Headphones'];

export default function Bluetooth() {
  const [open, setOpen] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [devices, setDevices] = useState<string[]>(DEFAULT_DEVICES);

  // Load state from local storage
  useEffect(() => {
    if (!isBrowser()) return;
    const storedEnabled = localStorage.getItem('bluetoothEnabled');
    const storedDevices = localStorage.getItem('bluetoothDevices');
    if (storedEnabled !== null) {
      setEnabled(storedEnabled === 'true');
    }
    if (storedDevices) {
      try {
        setDevices(JSON.parse(storedDevices));
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Persist enabled state
  useEffect(() => {
    if (!isBrowser()) return;
    localStorage.setItem('bluetoothEnabled', String(enabled));
  }, [enabled]);

  // Persist devices list
  useEffect(() => {
    if (!isBrowser()) return;
    localStorage.setItem('bluetoothDevices', JSON.stringify(devices));
  }, [devices]);

  return (
    <div className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-label="Bluetooth">
        <Image
          src="/themes/Yaru/status/bluetooth-symbolic.svg"
          alt="Bluetooth"
          width={24}
          height={24}
          className={enabled ? '' : 'opacity-40'}
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded bg-gray-800 p-3 text-sm text-white shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <span className="font-bold">Bluetooth</span>
            <button
              onClick={() => setEnabled((e) => !e)}
              className="rounded bg-gray-700 px-2 py-1"
            >
              {enabled ? 'Turn off' : 'Turn on'}
            </button>
          </div>
          {enabled ? (
            <ul className="space-y-1">
              {devices.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-600 dark:text-gray-400">Bluetooth is off</p>
          )}
        </div>
      )}
    </div>
  );
}

