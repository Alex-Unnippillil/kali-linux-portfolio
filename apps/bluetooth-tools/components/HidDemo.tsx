'use client';

import React, { useState } from 'react';

interface LogEntry {
  type: string;
  message: string;
}

const SignalBars: React.FC<{ level: number }> = ({ level }) => (
  <div className="flex items-end space-x-0.5">
    {[0, 1, 2, 3].map((i) => (
      <div
        // eslint-disable-next-line react/no-array-index-key
        key={i}
        className={`w-1.5 rounded-sm bg-green-400 ${
          i < level ? 'opacity-100' : 'opacity-30'
        }`}
        style={{ height: 4 * (i + 1) }}
      />
    ))}
  </div>
);

const getTypeIcon = (name?: string) => {
  const n = name?.toLowerCase() || '';
  if (n.includes('mouse')) return '🖱️';
  if (n.includes('keyboard')) return '⌨️';
  if (n.includes('head') || n.includes('ear') || n.includes('speaker'))
    return '🎧';
  return '📱';
};

const HidDemo: React.FC = () => {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [info, setInfo] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string>('');
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [signal, setSignal] = useState(0);
  const filters = ['All', 'Paired', 'Unpaired'];
  const [activeFilter, setActiveFilter] = useState('All');

  const log = (type: string, message: string) =>
    setLogs((l) => [...l, { type, message }]);

  const requestDevice = async () => {
    if (!navigator.bluetooth) {
      setError('Web Bluetooth is not supported in this browser.');
      return;
    }
    try {
      const dev = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'battery_service',
          'device_information',
          'human_interface_device',
        ],
      });
      setDevice(dev);
      setConnected(false);
      setSignal(Math.floor(Math.random() * 5));
      setError('');
      log('info', `Selected ${dev.name || dev.id}`);
    } catch (err: any) {
      // User cancelled or permission denied
      setError(err?.message || 'No device selected');
    }
  };

  const connect = async () => {
    if (!device) return;
    try {
      setConnecting(true);
      const server = await device.gatt?.connect();
      if (!server) throw new Error('GATT server not available');
      setConnected(true);
      setError('');

      try {
        const infoService = await server.getPrimaryService(
          'device_information'
        );
        const characteristics = await infoService.getCharacteristics();
        const entries: Record<string, string> = {};
        for (const char of characteristics) {
          const value = await char.readValue();
          const decoder = new TextDecoder('utf-8');
          entries[char.uuid] = decoder.decode(value.buffer).trim();
        }
        setInfo(entries);
      } catch (e) {
        log('warn', 'Device information not available');
      }

      try {
        const batteryService = await server.getPrimaryService(
          'battery_service'
        );
        const batteryChar = await batteryService.getCharacteristic(
          'battery_level'
        );
        const batteryValue = await batteryChar.readValue();
        setBattery(batteryValue.getUint8(0));
      } catch {
        log('warn', 'Battery information not available');
      }

      try {
        const hidService = await server.getPrimaryService(
          'human_interface_device'
        );
        const reportChar = await hidService.getCharacteristic('report');
        await reportChar.startNotifications();
        reportChar.addEventListener('characteristicvaluechanged', (e) => {
          const val = (e.target as BluetoothRemoteGATTCharacteristic).value;
          const bytes = Array.from(new Uint8Array(val.buffer));
          log('hid', bytes.map((b) => b.toString(16).padStart(2, '0')).join(' '));
        });
      } catch {
        log('warn', 'HID service not available');
      }
    } catch (err: any) {
      setConnected(false);
      setError(err?.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  const deviceVisible =
    device &&
    (activeFilter === 'All' ||
      (activeFilter === 'Paired' && connected) ||
      (activeFilter === 'Unpaired' && !connected));

  return (
    <div className="h-full w-full bg-black p-4 text-white">
      <div className="mb-4 flex space-x-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`rounded-full border px-3 py-1 text-sm ${
              activeFilter === f ? 'bg-white/20' : 'bg-transparent'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <button
        onClick={requestDevice}
        className="rounded bg-blue-600 px-3 py-1"
        disabled={connecting}
      >
        Select Device
      </button>

      {error && (
        <div className="mt-2 text-red-400">
          <p>{error}</p>
          <p className="text-xs">
            Tip: ensure the device is powered on and within range.
          </p>
        </div>
      )}

      {deviceVisible && (
        <div className="mt-4 flex items-center space-x-4">
          <div className="relative">
            <div className="flex h-24 w-24 items-center justify-center rounded bg-gray-700 text-3xl">
              {getTypeIcon(device?.name)}
            </div>
            <div className="absolute bottom-1 right-1">
              <SignalBars level={signal} />
            </div>
          </div>
          <div className="flex-1">
            <p className="font-bold">{device.name || device.id}</p>
            {connecting && (
              <span className="mt-1 inline-block rounded bg-yellow-600/30 px-2 py-0.5 text-xs">
                Pairing...
              </span>
            )}
            {connected && !connecting && (
              <span className="mt-1 inline-block rounded bg-green-600/30 px-2 py-0.5 text-xs">
                Paired
              </span>
            )}
            {battery !== null && <p>Battery: {battery}%</p>}
            {Object.keys(info).length > 0 && (
              <div className="mt-2 text-sm">
                {Object.entries(info).map(([k, v]) => (
                  <p key={k}>
                    {k}: {v}
                  </p>
                ))}
              </div>
            )}
          </div>
          <button
            onClick={connect}
            className="rounded bg-green-600 px-3 py-1"
            disabled={connecting || connected}
          >
            {connected ? 'Connected' : 'Connect'}
          </button>
        </div>
      )}

      <div className="mt-4 h-40 overflow-auto rounded bg-gray-800 p-2 text-sm">
        {logs.map((l, i) => (
          <p key={i} className={l.type === 'hid' ? 'text-green-300' : ''}>
            {l.type}: {l.message}
          </p>
        ))}
      </div>
    </div>
  );
};

export default HidDemo;
