'use client';

import React, { useMemo, useState } from 'react';
import PairDialog from './components/PairDialog';

const BleSensorApp: React.FC = () => {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [lastDevice, setLastDevice] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'connected' | 'reconnected' | 'disconnected'>(
    'idle',
  );

  const statusMessage = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return 'Sensor connected successfully.';
      case 'reconnected':
        return 'Sensor connection restored after a brief interruption.';
      case 'disconnected':
        return 'The sensor is disconnected. Open the pairing dialog to reconnect.';
      default:
        return 'Pair a nearby BLE sensor to inspect its services and characteristics.';
    }
  }, [connectionStatus]);

  return (
    <div className="flex h-full w-full flex-col bg-black p-6 text-white">
      <header className="mb-6 border-b border-gray-700 pb-4">
        <h1 className="text-2xl font-semibold">BLE Sensor Console</h1>
        <p className="mt-2 max-w-2xl text-sm text-gray-300">{statusMessage}</p>
        {lastDevice && (
          <p className="mt-2 text-sm text-gray-200">
            Last connected device: <span className="font-semibold">{lastDevice}</span>
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-4">
        <section className="rounded border border-gray-800 bg-gray-900 p-4 shadow-inner">
          <h2 className="text-lg font-semibold">Pairing</h2>
          <p className="mt-2 text-sm text-gray-300">
            The simulator uses the Web Bluetooth API and mirrors common issues like permission prompts,
            transient drops, and auto-reconnect behaviour.
          </p>
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="mt-4 inline-flex w-max items-center rounded bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-500"
          >
            Open pairing dialog
          </button>
        </section>

        <section className="grow rounded border border-gray-800 bg-gray-950 p-4">
          <h2 className="text-lg font-semibold">Session activity</h2>
          <p className="mt-2 text-sm text-gray-300">
            Connection attempts, permission hints, and reconnection events appear inside the pairing dialog.
            Use it as a reference for troubleshooting Web Bluetooth sessions in the field.
          </p>
        </section>
      </div>

      <PairDialog
        open={dialogOpen}
        onClose={() => {
          setDialogOpen(false);
          setConnectionStatus((prev) => (prev === 'idle' ? 'idle' : 'disconnected'));
        }}
        onConnected={({ device, reconnected }) => {
          setLastDevice(device.name || 'Unknown device');
          setConnectionStatus(reconnected ? 'reconnected' : 'connected');
        }}
      />
    </div>
  );
};

export default BleSensorApp;
