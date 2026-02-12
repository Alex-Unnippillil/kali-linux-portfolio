import React, { useEffect, useState, useRef } from 'react';
import FormError from '../ui/FormError';

// TODO: Remove Web Serial ambient declarations when
// https://github.com/WICG/serial/issues/200 is addressed and types ship.

const SerialTerminalApp: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const [port, setPort] = useState<SerialPort | null>(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);

  useEffect(() => {
    if (!supported) return;
    const serial = navigator.serial;
    if (!serial) return;
    const handleDisconnect = (e: Event & { readonly target: SerialPort }) => {
      if (e.target === port) {
        setError('Device disconnected.');
        setPort(null);
      }
    };
    serial.addEventListener('disconnect', handleDisconnect);
    return () => {
      serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [supported, port]);

  const readLoop = async (p: SerialPort) => {
    const textDecoder = new TextDecoderStream();
    const readableClosed = p.readable?.pipeTo(textDecoder.writable as WritableStream<Uint8Array>);
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) setLogs((l) => l + value);
      }
    } catch {
      // ignored
    } finally {
      reader.releaseLock();
      await readableClosed?.catch(() => {});
    }
  };

  const connect = async () => {
    if (!supported) return;
    setError('');
    try {
      const serial = navigator.serial;
      if (!serial) {
        throw new Error('Web Serial API unavailable.');
      }

      const p = await serial.requestPort();
      await p.open({ baudRate: 9600 });
      setPort(p);
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
    }
  };

  return (
    <div className="relative h-full w-full bg-black p-4 text-green-400 font-mono">
      <div className="mb-4 flex gap-2">
        {!port ? (
          <button
            onClick={connect}
            disabled={!supported}
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
      {!supported && (
        <p className="mb-2 text-sm text-yellow-400">
          Web Serial API not supported in this browser.
        </p>
      )}
      {error && <FormError className="mb-2 mt-0">{error}</FormError>}
      <pre className="h-[calc(100%-4rem)] overflow-auto whitespace-pre-wrap break-words">
        {logs || 'No data'}
      </pre>
    </div>
  );
};

export default SerialTerminalApp;
export const displaySerialTerminal = () => <SerialTerminalApp />;

