import React, { useEffect, useState, useRef, useCallback } from 'react';
import FormError from '../ui/FormError';
import Toast from '../ui/Toast';

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
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const activePortRef = useRef<SerialPort | null>(null);
  const manualDisconnectRef = useRef(false);
  const reconnectTimerRef = useRef<number | null>(null);
  const reconnectAttemptRef = useRef(0);

  const clearReconnect = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
    reconnectAttemptRef.current = 0;
  }, []);

  useEffect(() => clearReconnect, [clearReconnect]);

  useEffect(() => {
    if (!supported) return;
    const handleDisconnect = (e: Event & { readonly target: SerialPort }) => {
      if (e.target !== activePortRef.current) return;

      setError('Device disconnected.');
      const cancelPromise = readerRef.current?.cancel();
      cancelPromise?.catch(() => {});
      readerRef.current = null;
      setPort(null);

      if (manualDisconnectRef.current) {
        manualDisconnectRef.current = false;
        activePortRef.current = null;
        return;
      }

      setToast('Device disconnected. Attempting to reconnect...');
      clearReconnect();

      const scheduleReconnect = () => {
        const nextAttempt = reconnectAttemptRef.current + 1;
        const delay = Math.min(3000, 500 * 2 ** (nextAttempt - 1));
        reconnectTimerRef.current = window.setTimeout(() => {
          runReconnect(nextAttempt);
        }, delay);
      };

      const runReconnect = async (attempt: number) => {
        reconnectAttemptRef.current = attempt;
        const targetPort = activePortRef.current;

        if (!targetPort) {
          setToast('Reconnection failed: no port available.');
          clearReconnect();
          return;
        }

        setToast(`Reconnecting to device (attempt ${attempt})...`);

        try {
          await targetPort.open({ baudRate: 9600 });
          setPort(targetPort);
          setError('');
          setToast('Reconnected to device.');
          readLoop(targetPort);
          clearReconnect();
        } catch (err) {
          if (attempt >= 5) {
            setToast('Failed to reconnect. Please reconnect manually.');
            clearReconnect();
            return;
          }

          setToast(`Reconnect attempt ${attempt} failed. Retrying...`);
          scheduleReconnect();
        }
      };

      scheduleReconnect();
    };
    const nav = navigator as NavigatorSerial;
    const serialApi = nav.serial;
    serialApi.addEventListener('disconnect', handleDisconnect);
    return () => {
      serialApi.removeEventListener('disconnect', handleDisconnect);
    };
  }, [supported, clearReconnect]);

  const readLoop = async (p: SerialPort) => {
    const reader = p.readable?.getReader();
    if (!reader) return;
    readerRef.current = reader;
    const decoder = new TextDecoder();
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          setLogs((l) => l + decoder.decode(value, { stream: true }));
        }
      }
    } catch {
      // ignored
    } finally {
      reader.releaseLock();
      setLogs((l) => l + decoder.decode());
    }
  };

  const connect = async () => {
    if (!supported) return;
    setError('');
    try {
      const p = await (navigator as NavigatorSerial).serial.requestPort();
      await p.open({ baudRate: 9600 });
      setPort(p);
      activePortRef.current = p;
      manualDisconnectRef.current = false;
      clearReconnect();
      setToast('Connected to device.');
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
      manualDisconnectRef.current = true;
      clearReconnect();
      setToast('Disconnected from device.');
      await readerRef.current?.cancel();
      readerRef.current = null;
      await port?.close();
    } catch {
      // ignore
    } finally {
      setPort(null);
      activePortRef.current = null;
      manualDisconnectRef.current = false;
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
      {toast && <Toast message={toast} onClose={() => setToast('')} />}
    </div>
  );
};

export default SerialTerminalApp;
export const displaySerialTerminal = () => <SerialTerminalApp />;

