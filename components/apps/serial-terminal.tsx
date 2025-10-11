import React, { useEffect, useMemo, useRef, useState } from 'react';
import FormError from '../ui/FormError';
import {
  createSerialTransportStub,
  SerialLike,
  SerialPortLike,
} from '../../utils/serialTransportStub';

type NavigatorSerial = Navigator & { serial: SerialLike };

const STATUS_TEXT: Record<'idle' | 'connecting' | 'connected', string> = {
  idle: 'Not connected',
  connecting: 'Connecting…',
  connected: 'Connected',
};

const SerialTerminalApp: React.FC = () => {
  const nativeSupported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const fallbackSerial = useMemo(() => createSerialTransportStub(), []);
  const serial = nativeSupported
    ? (navigator as NavigatorSerial).serial
    : fallbackSerial.serial;
  const isDemo = !nativeSupported;

  const [port, setPort] = useState<SerialPortLike | null>(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  useEffect(() => {
    const handleDisconnect = (e: Event & { readonly target: SerialPortLike }) => {
      if (e.target === port) {
        setError('Device disconnected.');
        setPort(null);
        setStatus('idle');
      }
    };
    serial.addEventListener('disconnect', handleDisconnect);
    return () => {
      serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [serial, port]);

  useEffect(() => {
    return () => {
      void readerRef.current?.cancel().catch(() => undefined);
      void port?.close().catch(() => undefined);
    };
  }, [port]);

  const readLoop = async (p: SerialPortLike) => {
    const readable = p.readable;
    if (!readable) return;
    const reader = readable.getReader();
    readerRef.current = reader;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          const decoded = decoder.decode(value, { stream: true });
          if (decoded) setLogs((l) => l + decoded);
        }
      }
    } catch {
      // ignored
    } finally {
      reader.releaseLock();
      const remainder = decoder.decode();
      if (remainder) setLogs((l) => l + remainder);
    }
  };

  const connect = async () => {
    setError('');
    setStatus('connecting');
    setLogs('');
    try {
      const p = await serial.requestPort();
      await p.open({ baudRate: 9600 });
      setPort(p);
      setStatus('connected');
      readLoop(p);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotAllowedError') {
        setError('Permission to access serial port was denied.');
      } else if (e.name === 'NotFoundError') {
        setError('No port selected.');
      } else {
        setError(e.message || 'Failed to open serial port.');
      }
      setStatus('idle');
    }
  };

  const disconnect = async () => {
    try {
      await readerRef.current?.cancel();
      await port?.close();
    } catch {
      // ignore
    } finally {
      setPort(null);
      setStatus('idle');
    }
  };

  return (
    <div className="relative h-full w-full bg-black p-4 text-green-400 font-mono">
      <div className="mb-4 flex gap-2">
        {!port ? (
          <button
            onClick={connect}
            disabled={status === 'connecting'}
            className="rounded bg-gray-700 px-2 py-1 text-white disabled:opacity-50"
          >
            Connect
          </button>
        ) : (
          <button
            onClick={disconnect}
            className="rounded bg-red-700 px-2 py-1 text-white"
          >
            Disconnect
          </button>
        )}
      </div>
      {isDemo && (
        <div className="mb-2 space-y-1 text-sm text-yellow-300" role="status" aria-live="polite">
          <p>Web Serial API not supported in this browser.</p>
          <p>Running in demo mode with a simulated serial device.</p>
        </div>
      )}
      {error && <FormError className="mb-2 mt-0">{error}</FormError>}
      <p className="mb-2 text-xs text-green-300" aria-live="polite">
        Status: {STATUS_TEXT[status]}
      </p>
      <pre className="h-[calc(100%-4rem)] overflow-auto whitespace-pre-wrap break-words">
        {logs || 'No data'}
      </pre>
    </div>
  );
};

export default SerialTerminalApp;
export const displaySerialTerminal = () => <SerialTerminalApp />;

