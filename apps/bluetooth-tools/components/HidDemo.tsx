'use client';

import React, { useState } from 'react';

interface LogEntry {
  type: string;
  message: string;
}

const HidDemo: React.FC = () => {
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [battery, setBattery] = useState<number | null>(null);
  const [info, setInfo] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string>('');
  const [connecting, setConnecting] = useState(false);

  const log = (type: string, message: string) =>
    setLogs((l) => [...l, { type, message }]);

  const requestDevice = async () => {
    if (!('bluetooth' in navigator)) {
      setError('Web Bluetooth is not supported in this browser.');
      return;
    }
    try {
      const dev = await navigator.bluetooth!.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          'battery_service',
          'device_information',
          'human_interface_device',
        ],
      });
      setDevice(dev);
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
        reportChar.addEventListener('characteristicvaluechanged', (e: Event) => {
          const val = (e.target as BluetoothRemoteGATTCharacteristic).value!;
          const bytes = Array.from(new Uint8Array(val.buffer));
          log('hid', bytes.map((b) => b.toString(16).padStart(2, '0')).join(' '));
        });
      } catch {
        log('warn', 'HID service not available');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to connect');
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div className="h-full w-full bg-black p-4 text-white">
      <button
        onClick={requestDevice}
        className="rounded bg-blue-600 px-3 py-1"
        disabled={connecting}
      >
        Select Device
      </button>
      {device && (
        <button
          onClick={connect}
          className="ml-2 rounded bg-green-600 px-3 py-1"
          disabled={connecting}
        >
          Connect
        </button>
      )}
      {error && <p className="mt-2 text-red-400">{error}</p>}
      {device && (
        <div className="mt-4">
          <p className="font-bold">{device.name || device.id}</p>
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
