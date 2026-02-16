import React, { useEffect, useState, useRef } from 'react';
import FormError from '../ui/FormError';

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface Serial {
  requestPort(): Promise<SerialPort>;
  addEventListener(type: 'disconnect', listener: (ev: Event & { readonly target: SerialPort }) => void): void;
  removeEventListener(type: 'disconnect', listener: (ev: Event & { readonly target: SerialPort }) => void): void;
}

type NavigatorSerial = Navigator & { serial: Serial };

const SerialTerminalApp: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const [port, setPort] = useState<SerialPort | null>(null);
  const [logs, setLogs] = useState('');
  const [baudRate, setBaudRate] = useState(9600);
  const [bytesReceived, setBytesReceived] = useState(0);
  const [autoScroll, setAutoScroll] = useState(true);
  const [error, setError] = useState('');
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const outputRef = useRef<HTMLPreElement | null>(null);

  const maxLogChars = 8000;

  useEffect(() => {
    if (!supported) return;
    const handleDisconnect = (e: Event & { readonly target: SerialPort }) => {
      if (e.target === port) {
        setError('Device disconnected.');
        setPort(null);
      }
    };
    const nav = navigator as NavigatorSerial;
    nav.serial.addEventListener('disconnect', handleDisconnect);
    return () => {
      nav.serial.removeEventListener('disconnect', handleDisconnect);
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
        if (value) {
          setLogs((currentLogs) => {
            const nextLogs = currentLogs + value;
            if (nextLogs.length <= maxLogChars) {
              return nextLogs;
            }
            return nextLogs.slice(nextLogs.length - maxLogChars);
          });
          setBytesReceived((currentCount) => currentCount + value.length);
        }
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
      const p = await (navigator as NavigatorSerial).serial.requestPort();
      await p.open({ baudRate });
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

  useEffect(() => {
    if (autoScroll && outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [logs, autoScroll]);

  const clearOutput = () => {
    setLogs('');
    setBytesReceived(0);
  };

  return (
    <div className="relative h-full w-full bg-black p-4 text-green-400 font-mono">
      <div className="mb-3 flex flex-wrap items-center gap-2">
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
        <button
          onClick={clearOutput}
          className="rounded bg-gray-800 px-2 py-1 text-white"
        >
          Clear Output
        </button>
        <label htmlFor="baudRate" className="text-xs text-green-200">
          Baud
        </label>
        <select
          id="baudRate"
          value={baudRate}
          onChange={(event) => setBaudRate(Number(event.target.value))}
          disabled={Boolean(port)}
          className="rounded border border-green-700 bg-black px-2 py-1 text-xs text-green-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {[9600, 19200, 38400, 57600, 115200].map((rate) => (
            <option key={rate} value={rate}>
              {rate}
            </option>
          ))}
        </select>
        <label className="ml-1 inline-flex items-center gap-1 text-xs text-green-200">
          <input
            type="checkbox"
            aria-label="Auto-scroll output"
            checked={autoScroll}
            onChange={(event) => setAutoScroll(event.target.checked)}
          />
          Auto-scroll
        </label>
      </div>
      <div className="mb-2 flex flex-wrap items-center gap-3 text-xs text-green-300">
        <span>Status: {port ? 'Connected' : 'Disconnected'}</span>
        <span>Baud: {baudRate}</span>
        <span>Bytes received: {bytesReceived}</span>
      </div>
      {!supported && (
        <p className="mb-2 text-sm text-yellow-400">
          Web Serial API not supported in this browser.
        </p>
      )}
      {error && <FormError className="mb-2 mt-0">{error}</FormError>}
      <pre
        ref={outputRef}
        className="h-[calc(100%-7rem)] overflow-auto whitespace-pre-wrap break-words rounded border border-green-900/70 bg-black/80 p-2"
      >
        {logs || 'No data'}
      </pre>
    </div>
  );
};

export default SerialTerminalApp;
export const displaySerialTerminal = () => <SerialTerminalApp />;
