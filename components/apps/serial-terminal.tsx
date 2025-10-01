import React, { useEffect, useState, useRef, useCallback } from 'react';
import FormError from '../ui/FormError';
import {
  SerialExportFormat,
  SerialExportSession,
  SerialFrame,
  parseSerialExport,
  replaySerialExport,
} from '../../services/serial/export';

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
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);
  const sessionRef = useRef<SerialExportSession>(
    new SerialExportSession({ meta: { app: 'serial-terminal' } }),
  );
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [timeline, setTimeline] = useState<SerialFrame[]>([]);
  const [exporting, setExporting] = useState(false);
  const [importing, setImporting] = useState(false);

  const appendFrame = useCallback(
    (frame: SerialFrame) => {
      setError('');
      setFrameCount(frame.index + 1);
      setTimeline((prev) => {
        const next = [...prev, frame];
        return next.length > 200 ? next.slice(next.length - 200) : next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!supported) return;
    const handleDisconnect = (e: Event & { readonly target: SerialPort }) => {
      if (e.target === port) {
        setError('Device disconnected.');
        setPort(null);
        const frame = sessionRef.current.record('Device disconnected.', {
          meta: { direction: 'system', event: 'disconnect' },
        });
        appendFrame(frame);
      }
    };
    const nav = navigator as NavigatorSerial;
    nav.serial.addEventListener('disconnect', handleDisconnect);
    return () => {
      nav.serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [supported, port, appendFrame]);

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
          setLogs((l) => l + value);
          const frame = sessionRef.current.record(value, {
            meta: { direction: 'in', event: 'data', length: value.length },
          });
          appendFrame(frame);
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
      await p.open({ baudRate: 9600 });
      setPort(p);
      sessionRef.current.reset({ app: 'serial-terminal' });
      setFrameCount(0);
      setTimeline([]);
      setLogs('');
      const frame = sessionRef.current.record('Serial port opened.', {
        meta: { direction: 'system', event: 'connect' },
      });
      appendFrame(frame);
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
      const frame = sessionRef.current.record(`Connection error: ${e.message || e.name}`, {
        meta: { direction: 'system', event: 'error' },
      });
      appendFrame(frame);
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
      const frame = sessionRef.current.record('Serial port closed.', {
        meta: { direction: 'system', event: 'disconnect' },
      });
      appendFrame(frame);
    }
  };

  const handleExport = useCallback(
    async (format: SerialExportFormat) => {
      if (!frameCount) {
        setError('No frames captured to export.');
        return;
      }
      setError('');
      setExporting(true);
      try {
        if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
          const ext = format === 'json' ? 'json' : 'pcap';
          const accept =
            format === 'json'
              ? { 'application/json': ['.json'] }
              : {
                  'application/vnd.tcpdump.pcap': ['.pcap'],
                };
          const picker: any = await (window as any).showSaveFilePicker({
            suggestedName: `serial-session-${new Date()
              .toISOString()
              .replace(/[:.]/g, '-')}.${ext}`,
            types: [
              {
                description: format === 'json' ? 'JSON export' : 'PCAP export',
                accept,
              },
            ],
          });
          const writable = await picker.createWritable();
          await sessionRef.current.streamToWritable(writable, format, {
            pretty: format === 'json',
          });
        } else {
          const blob = await sessionRef.current.toBlob(format, {
            pretty: format === 'json',
          });
          const url = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `serial-session.${format === 'json' ? 'json' : 'pcap'}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        }
      } catch (exportError) {
        console.error(exportError);
        setError('Failed to export session.');
      } finally {
        setExporting(false);
      }
    },
    [frameCount],
  );

  const handleImport = useCallback(async () => {
    const input = fileInputRef.current;
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    setImporting(true);
    setError('');
    try {
      const envelope = await parseSerialExport(file);
      const session = SerialExportSession.fromEnvelope(envelope);
      sessionRef.current = session;
      const frames = session.getFrames();
      setFrameCount(frames.length);
      setTimeline(frames.slice(Math.max(0, frames.length - 200)));
      setLogs('');
      await replaySerialExport(frames, (frame) => {
        setLogs((prev) => prev + frame.data);
      });
    } catch (importError) {
      console.error(importError);
      setError('Failed to import session.');
    } finally {
      if (input) input.value = '';
      setImporting(false);
    }
  }, []);

  return (
    <div className="relative h-full w-full bg-black p-4 text-green-400 font-mono">
      <div className="mb-4 flex flex-wrap gap-2">
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
          onClick={() => handleExport('json')}
          disabled={!frameCount || exporting}
          className="rounded bg-blue-700 px-2 py-1 text-white disabled:opacity-50"
        >
          Export JSON
        </button>
        <button
          onClick={() => handleExport('pcap')}
          disabled={!frameCount || exporting}
          className="rounded bg-purple-700 px-2 py-1 text-white disabled:opacity-50"
        >
          Export PCAP
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="rounded bg-emerald-700 px-2 py-1 text-white disabled:opacity-50"
        >
          Import Session
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.pcap,.pcapng"
          className="hidden"
          onChange={handleImport}
        />
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
      <div className="mt-3 text-xs text-green-200">
        <details>
          <summary className="cursor-pointer text-green-400">
            Timeline ({frameCount} frame{frameCount === 1 ? '' : 's'})
          </summary>
          <ul className="mt-2 max-h-40 space-y-1 overflow-auto pr-2">
            {timeline.map((frame) => (
              <li key={frame.index} className="flex flex-col gap-0.5">
                <span className="font-semibold text-green-300">
                  {new Date(frame.timestamp).toLocaleTimeString()} · {frame.meta.direction}
                </span>
                <span className="text-green-200/80">
                  {frame.data.length > 64
                    ? `${frame.data.slice(0, 61)}...`
                    : frame.data || '[empty frame]'}
                </span>
              </li>
            ))}
          </ul>
        </details>
      </div>
    </div>
  );
};

export default SerialTerminalApp;
export const displaySerialTerminal = () => <SerialTerminalApp />;

