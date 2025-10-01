import React, { useEffect, useState } from 'react';
import FormError from '../ui/FormError';
import Receive from './serial-terminal/Receive';
import type { NavigatorSerial, SerialPortLike } from './serial-terminal/types';

const SerialTerminalApp: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const [port, setPort] = useState<SerialPortLike | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  useEffect(() => {
    if (!supported) return;
    const handleDisconnect = (event: Event & { readonly target: SerialPortLike }) => {
      if (event.target === port) {
        setError('Device disconnected.');
        setPort(null);
        setStatus('disconnected');
      }
    };
    const nav = navigator as NavigatorSerial;
    nav.serial.addEventListener('disconnect', handleDisconnect);
    return () => {
      nav.serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [supported, port]);

  const connect = async () => {
    if (!supported) return;
    setError('');
    setStatus('connecting');
    try {
      const selectedPort = await (navigator as NavigatorSerial).serial.requestPort();
      await selectedPort.open({ baudRate: 9600 });
      setPort(selectedPort);
      setStatus('connected');
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError') {
        setError('Permission to access serial port was denied.');
      } else if (e.name === 'NotFoundError') {
        setError('No port selected.');
      } else {
        setError(e.message || 'Failed to open serial port.');
      }
      setStatus('disconnected');
    }
  };

  const disconnect = async () => {
    if (!port) return;
    setStatus('disconnected');
    try {
      await port.close();
    } catch {
      // ignore close errors
    } finally {
      setPort(null);
    }
  };

  const statusLabel = status === 'connected' ? 'Connected' : status === 'connecting' ? 'Requesting access…' : 'Disconnected';

  return (
    <div className="relative h-full w-full overflow-y-auto bg-slate-950 p-4 text-slate-100">
      <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
        <div className="flex items-center gap-2">
          <button
            onClick={port ? disconnect : connect}
            disabled={!supported || status === 'connecting'}
            className="rounded border border-slate-600 bg-slate-800 px-3 py-1 font-semibold text-slate-100 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/50 disabled:text-slate-400"
          >
            {port ? 'Disconnect' : 'Connect'}
          </button>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              status === 'connected'
                ? 'bg-emerald-500/20 text-emerald-200'
                : status === 'connecting'
                ? 'bg-amber-500/20 text-amber-200'
                : 'bg-slate-700/50 text-slate-300'
            }`}
          >
            {statusLabel}
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Configure your device to stream binary data at 9600 baud, then start a capture session below.
        </p>
      </div>
      {!supported && (
        <p className="mb-3 text-xs text-yellow-300">
          Web Serial API not supported in this browser.
        </p>
      )}
      {error && <FormError className="mb-4 mt-0">{error}</FormError>}
      {!port && (
        <div className="mb-4 rounded border border-dashed border-slate-700 bg-slate-900/60 p-6 text-center text-xs text-slate-400">
          Connect to a serial device to begin monitoring incoming data. Once connected you can manually start recording and
          save detected files.
        </div>
      )}
      <Receive port={port} />
    </div>
  );
};

export default SerialTerminalApp;
export const displaySerialTerminal = () => <SerialTerminalApp />;
