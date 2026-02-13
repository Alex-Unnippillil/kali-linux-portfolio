import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import FormError from '../ui/FormError';

const DEFAULT_MAX_LOG_BYTES = 100_000;

export type SerialLogEntry = {
  timestamp: number;
  data: string;
};

export interface UseSerialLogOptions {
  maxBytes?: number;
}

export interface UseSerialLogValue {
  entries: SerialLogEntry[];
  totalBytes: number;
  appendLog: (data: string) => void;
  clearLogs: () => void;
  loggingEnabled: boolean;
  setLoggingEnabled: (value: boolean) => void;
  persistLogs: boolean;
  setPersistLogs: (value: boolean) => void;
  resetOnDisconnect: () => void;
}

export const useSerialLog = (options?: UseSerialLogOptions): UseSerialLogValue => {
  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_LOG_BYTES;
  const [state, setState] = useState<{ entries: SerialLogEntry[]; totalBytes: number }>({
    entries: [],
    totalBytes: 0,
  });
  const [loggingEnabledState, setLoggingEnabledState] = useState(true);
  const [persistLogsState, setPersistLogsState] = useState(false);
  const loggingRef = useRef(loggingEnabledState);
  const persistRef = useRef(persistLogsState);

  const setLoggingEnabled = useCallback((value: boolean) => {
    loggingRef.current = value;
    setLoggingEnabledState(value);
  }, []);

  const setPersistLogs = useCallback((value: boolean) => {
    persistRef.current = value;
    setPersistLogsState(value);
  }, []);

  const appendLog = useCallback(
    (data: string) => {
      if (!loggingRef.current || !data) {
        return;
      }
      setState((prev) => {
        const entry: SerialLogEntry = { timestamp: Date.now(), data };
        const nextEntries = [...prev.entries, entry];
        let totalBytes = prev.totalBytes + data.length;
        while (totalBytes > maxBytes && nextEntries.length > 0) {
          const removed = nextEntries.shift();
          if (removed) {
            totalBytes -= removed.data.length;
          }
        }
        return { entries: nextEntries, totalBytes };
      });
    },
    [maxBytes],
  );

  const clearLogs = useCallback(() => {
    setState({ entries: [], totalBytes: 0 });
  }, []);

  const resetOnDisconnect = useCallback(() => {
    if (!persistRef.current) {
      clearLogs();
    }
  }, [clearLogs]);

  return {
    entries: state.entries,
    totalBytes: state.totalBytes,
    appendLog,
    clearLogs,
    loggingEnabled: loggingEnabledState,
    setLoggingEnabled,
    persistLogs: persistLogsState,
    setPersistLogs,
    resetOnDisconnect,
  };
};

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
  const [error, setError] = useState('');
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const [viewMode, setViewMode] = useState<'ascii' | 'hex'>('ascii');
  const { entries, appendLog, loggingEnabled, setLoggingEnabled, persistLogs, setPersistLogs, resetOnDisconnect } =
    useSerialLog();

  const formattedLog = useMemo(() => {
    return entries
      .map((entry) => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const payload =
          viewMode === 'hex'
            ? Array.from(entry.data)
                .map((char) => char.charCodeAt(0).toString(16).padStart(2, '0'))
                .join(' ')
            : entry.data;
        return `[${time}] ${payload}`;
      })
      .join('\n');
  }, [entries, viewMode]);

  const downloadLog = () => {
    if (typeof window === 'undefined' || entries.length === 0) {
      return;
    }
    const blob = new Blob([formattedLog], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'serial-terminal-log.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (!supported) return;
    const handleDisconnect = (e: Event & { readonly target: SerialPort }) => {
      if (e.target === port) {
        setError('Device disconnected.');
        resetOnDisconnect();
        setPort(null);
      }
    };
    const nav = navigator as NavigatorSerial;
    nav.serial.addEventListener('disconnect', handleDisconnect);
    return () => {
      nav.serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [supported, port, resetOnDisconnect]);

  const readLoop = async (p: SerialPort) => {
    const textDecoder = new TextDecoderStream();
    const readableClosed = p.readable?.pipeTo(textDecoder.writable as WritableStream<Uint8Array>);
    const reader = textDecoder.readable.getReader();
    readerRef.current = reader;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) appendLog(value);
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
      resetOnDisconnect();
      setPort(null);
    }
  };

  return (
    <div className="relative h-full w-full bg-black p-4 text-green-400 font-mono">
      <div className="mb-4 flex flex-wrap gap-2 text-sm">
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
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            aria-label="Toggle logging"
            checked={loggingEnabled}
            onChange={(event) => setLoggingEnabled(event.target.checked)}
          />
          Logging
        </label>
        <label className="flex items-center gap-1">
          <input
            type="checkbox"
            aria-label="Persist logs between connections"
            checked={persistLogs}
            onChange={(event) => setPersistLogs(event.target.checked)}
          />
          Persist logs
        </label>
        <label className="flex items-center gap-1">
          View
          <select
            value={viewMode}
            aria-label="Select log view mode"
            onChange={(event) => setViewMode(event.target.value as 'ascii' | 'hex')}
            className="rounded bg-gray-800 px-1 py-0.5 text-white"
          >
            <option value="ascii">ASCII</option>
            <option value="hex">Hex</option>
          </select>
        </label>
        <button
          onClick={downloadLog}
          disabled={entries.length === 0}
          className="rounded bg-blue-700 px-2 py-1 text-white disabled:opacity-50"
        >
          Download log
        </button>
      </div>
      {!supported && (
        <p className="mb-2 text-sm text-yellow-400">
          Web Serial API not supported in this browser.
        </p>
      )}
      {error && <FormError className="mb-2 mt-0">{error}</FormError>}
      {!loggingEnabled && (
        <p className="mb-2 text-xs text-yellow-300">Logging paused. Incoming data will be ignored.</p>
      )}
      <pre className="h-[calc(100%-6rem)] overflow-auto whitespace-pre-wrap break-words" aria-label="serial terminal log">
        {formattedLog || 'No data'}
      </pre>
    </div>
  );
};

export default SerialTerminalApp;
export const displaySerialTerminal = () => <SerialTerminalApp />;

