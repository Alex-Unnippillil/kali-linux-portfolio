"use client";

import { useEffect } from 'react';
import usePersistentState from '../../hooks/usePersistentState';
import useBluetoothController from '../../hooks/useBluetoothController';

interface Props {
  open: boolean;
}

const QuickSettings = ({ open }: Props) => {
  const [theme, setTheme] = usePersistentState('qs-theme', 'light');
  const [sound, setSound] = usePersistentState('qs-sound', true);
  const [online, setOnline] = usePersistentState('qs-online', true);
  const [reduceMotion, setReduceMotion] = usePersistentState('qs-reduce-motion', false);
  const {
    status: bluetoothStatus,
    deviceName,
    batteryLevel,
    supported: bluetoothSupported,
    busy,
    canRetry,
    startPairing,
    retryPairing,
    disconnectDevice,
  } = useBluetoothController();

  const bluetoothMessage: Record<string, string> = {
    connected: 'Connected',
    reconnecting: 'Reconnecting…',
    requesting: 'Awaiting permission…',
    connecting: 'Pairing…',
    discovering: 'Reading services…',
    disconnected: 'Disconnected',
    error: 'Error — tap retry',
    idle: bluetoothSupported ? 'Ready to connect' : 'Unavailable',
  };

  const bluetoothAction = () => {
    if (bluetoothStatus === 'connected') {
      disconnectDevice();
      return;
    }
    if (canRetry) {
      retryPairing();
      return;
    }
    startPairing();
  };

  const bluetoothActionLabel =
    bluetoothStatus === 'connected' ? 'Disconnect' : canRetry ? 'Retry' : 'Connect';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    document.documentElement.classList.toggle('reduce-motion', reduceMotion);
  }, [reduceMotion]);

  return (
    <div
      className={`absolute bg-ub-cool-grey rounded-md py-4 top-9 right-3 shadow border-black border border-opacity-20 ${
        open ? '' : 'hidden'
      }`}
    >
      <div className="px-4 pb-3 border-b border-black border-opacity-10 mb-3">
        <div className="flex items-start justify-between gap-3 text-sm">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-200">Bluetooth</p>
            <p className="text-sm font-semibold">
              {deviceName || 'No device'}
            </p>
            <p className="text-xs text-gray-200">
              {bluetoothMessage[bluetoothStatus] ?? bluetoothMessage.idle}
            </p>
            {bluetoothSupported &&
              batteryLevel !== null &&
              batteryLevel !== undefined && (
                <p className="mt-1 text-xs text-gray-200">🔋 Battery {batteryLevel}%</p>
              )}
          </div>
          <button
            className="rounded bg-ub-orange px-2 py-1 text-xs font-semibold text-black disabled:opacity-50"
            onClick={bluetoothAction}
            disabled={!bluetoothSupported || busy}
          >
            {busy ? 'Working…' : bluetoothActionLabel}
          </button>
        </div>
      </div>
      <div className="px-4 pb-2">
        <button
          className="w-full flex justify-between"
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
        >
          <span>Theme</span>
          <span>{theme === 'light' ? 'Light' : 'Dark'}</span>
        </button>
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Sound</span>
        <input type="checkbox" checked={sound} onChange={() => setSound(!sound)} />
      </div>
      <div className="px-4 pb-2 flex justify-between">
        <span>Network</span>
        <input type="checkbox" checked={online} onChange={() => setOnline(!online)} />
      </div>
      <div className="px-4 flex justify-between">
        <span>Reduced motion</span>
        <input
          type="checkbox"
          checked={reduceMotion}
          onChange={() => setReduceMotion(!reduceMotion)}
        />
      </div>
    </div>
  );
};

export default QuickSettings;
