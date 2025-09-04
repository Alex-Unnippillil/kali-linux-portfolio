import React, { useState } from 'react';
import Image from 'next/image';
import usePersistentState from '../../hooks/usePersistentState';

const ICON = '/themes/Yaru/status/bluetooth-symbolic.svg';

const BluetoothTray: React.FC = () => {
  const [enabled, setEnabled] = usePersistentState<boolean>('tray-bluetooth', false);
  const [open, setOpen] = useState(false);

  return (
    <div className="relative mx-1.5">
      <button
        type="button"
        className="relative flex items-center focus:outline-none"
        onClick={() => setOpen(!open)}
        title={enabled ? 'Bluetooth on' : 'Bluetooth off'}
        aria-label="Bluetooth status"
      >
        <Image
          width={16}
          height={16}
          src={ICON}
          alt={enabled ? 'Bluetooth on' : 'Bluetooth off'}
          className={`inline status-symbol w-4 h-4 ${enabled ? '' : 'opacity-40'}`}
          sizes="16px"
        />
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-40 bg-ub-cool-grey rounded-md shadow border border-black border-opacity-20 z-50 p-3">
          <div className="flex justify-between items-center mb-2">
            <span>Bluetooth</span>
            <input
              type="checkbox"
              checked={enabled}
              onChange={() => setEnabled(!enabled)}
              aria-label="Toggle Bluetooth"
            />
          </div>
          <div className="text-center text-xs text-ubt-grey">Devices…</div>
        </div>
      )}
    </div>
  );
};

export default BluetoothTray;
