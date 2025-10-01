import React, { useEffect, useMemo, useRef, useState } from 'react';
import FormError from '../ui/FormError';
import {
  analyzeXonXoff,
  createXonSuggestion,
  detectEncoding,
  evaluateHardwareSignals,
  type EncodingOption,
  type EncodingSuggestion,
  type SignalSuggestion,
  type XonXoffStats,
} from '../../utils/serial/detection';

interface SerialSignals {
  readonly clearToSend?: boolean;
  readonly dataCarrierDetect?: boolean;
  readonly ringIndicator?: boolean;
  readonly requestToSend?: boolean;
}

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
  getSignals?(): Promise<SerialSignals>;
  setSignals?(signals: { requestToSend?: boolean; dataTerminalReady?: boolean }): Promise<void>;
}

interface Serial {
  requestPort(): Promise<SerialPort>;
  addEventListener(type: 'disconnect', listener: (ev: Event & { readonly target: SerialPort }) => void): void;
  removeEventListener(type: 'disconnect', listener: (ev: Event & { readonly target: SerialPort }) => void): void;
}

type NavigatorSerial = Navigator & { serial: Serial };

const signalOrder: Record<SignalSuggestion['type'], number> = {
  CTS: 0,
  RTS: 1,
  'XON/XOFF': 2,
};

const decodeBuffer = (encoding: EncodingOption, buffer: number[]) => {
  if (buffer.length === 0) return '';
  const decoder = new TextDecoder(encoding, { fatal: false });
  return decoder.decode(new Uint8Array(buffer));
};

const SerialTerminalApp: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const [port, setPort] = useState<SerialPort | null>(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const [signalSuggestions, setSignalSuggestions] = useState<SignalSuggestion[]>([]);
  const [appliedSignals, setAppliedSignals] = useState<SignalSuggestion['type'][]>([]);
  const [encoding, setEncoding] = useState<EncodingOption>('utf-8');
  const [encodingSuggestion, setEncodingSuggestion] = useState<EncodingSuggestion | null>(null);
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);
  const rawBufferRef = useRef<number[]>([]);
  const encodingRef = useRef<EncodingOption>('utf-8');
  const xonStatsRef = useRef<XonXoffStats>({ xon: 0, xoff: 0, totalBytes: 0 });

  const sortedSuggestions = useMemo(
    () => [...signalSuggestions].sort((a, b) => signalOrder[a.type] - signalOrder[b.type]),
    [signalSuggestions],
  );

  const updateSignalSuggestion = (suggestion: SignalSuggestion) => {
    setSignalSuggestions((prev) => {
      const filtered = prev.filter((item) => item.type !== suggestion.type);
      return [...filtered, suggestion];
    });
  };

  const resetSessionState = () => {
    rawBufferRef.current = [];
    xonStatsRef.current = { xon: 0, xoff: 0, totalBytes: 0 };
    setLogs('');
    setEncoding('utf-8');
    encodingRef.current = 'utf-8';
    setEncodingSuggestion(null);
    setSignalSuggestions([]);
    setAppliedSignals([]);
  };

  useEffect(() => {
    if (!supported) return;
    const handleDisconnect = (e: Event & { readonly target: SerialPort }) => {
      if (e.target === port) {
        setError('Device disconnected.');
        setPort(null);
        resetSessionState();
      }
    };
    const nav = navigator as NavigatorSerial;
    nav.serial.addEventListener('disconnect', handleDisconnect);
    return () => {
      nav.serial.removeEventListener('disconnect', handleDisconnect);
    };
  }, [supported, port]);

  const readLoop = async (p: SerialPort) => {
    const reader = p.readable?.getReader();
    if (!reader) return;
    readerRef.current = reader;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        if (value) {
          rawBufferRef.current.push(...value);
          const stats = analyzeXonXoff(value);
          xonStatsRef.current = {
            xon: xonStatsRef.current.xon + stats.xon,
            xoff: xonStatsRef.current.xoff + stats.xoff,
            totalBytes: xonStatsRef.current.totalBytes + value.length,
          };
          updateSignalSuggestion(createXonSuggestion(xonStatsRef.current));

          const activeEncoding = encodingRef.current;
          setLogs(decodeBuffer(activeEncoding, rawBufferRef.current));

          const sample = rawBufferRef.current.slice(-4096);
          setEncodingSuggestion(detectEncoding(new Uint8Array(sample)));
        }
      }
    } catch {
      // ignored
    } finally {
      reader.releaseLock();
    }
  };

  const connect = async () => {
    if (!supported) return;
    setError('');
    try {
      const p = await (navigator as NavigatorSerial).serial.requestPort();
      await p.open({ baudRate: 9600 });
      setPort(p);
      const hardwareSuggestions = await (async () => {
        try {
          const signals = await p.getSignals?.();
          return evaluateHardwareSignals({
            clearToSend: signals?.clearToSend,
            requestToSend: signals?.requestToSend,
          });
        } catch {
          return evaluateHardwareSignals({});
        }
      })();
      hardwareSuggestions.forEach(updateSignalSuggestion);
      updateSignalSuggestion(createXonSuggestion(xonStatsRef.current));
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
      resetSessionState();
    }
  };

  const applySignalSuggestion = async (suggestion: SignalSuggestion) => {
    if (suggestion.type === 'RTS' && port?.setSignals) {
      try {
        await port.setSignals({ requestToSend: suggestion.state === 'enabled' });
      } catch {
        setError('Failed to update RTS line on the active session.');
        return;
      }
    }
    setAppliedSignals((prev) => (prev.includes(suggestion.type) ? prev : [...prev, suggestion.type]));
  };

  const applyEncoding = (suggestion: EncodingSuggestion) => {
    encodingRef.current = suggestion.encoding;
    setEncoding(suggestion.encoding);
  };

  useEffect(() => {
    encodingRef.current = encoding;
    setLogs(decodeBuffer(encoding, rawBufferRef.current));
  }, [encoding]);

  return (
    <div className="relative h-full w-full bg-black p-4 font-mono text-green-400">
      <div className="grid h-full gap-4 md:grid-cols-[2fr_1fr]">
        <div className="flex h-full flex-col">
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
              <button onClick={disconnect} className="rounded bg-red-700 px-2 py-1 text-white">
                Disconnect
              </button>
            )}
          </div>
          {!supported && (
            <p className="mb-2 text-sm text-yellow-400">Web Serial API not supported in this browser.</p>
          )}
          {error && <FormError className="mb-2 mt-0">{error}</FormError>}
          <pre className="flex-1 overflow-auto whitespace-pre-wrap break-words rounded border border-green-700/40 bg-black/60 p-3">
            {logs || 'No data'}
          </pre>
        </div>
        <aside className="flex h-full flex-col gap-4 rounded border border-green-700/40 bg-gray-900/60 p-4 text-xs text-green-200">
          <div>
            <h2 className="mb-2 text-sm font-semibold text-green-300">Signal recommendations</h2>
            <ul className="space-y-3">
              {sortedSuggestions.map((suggestion) => {
                const applied = appliedSignals.includes(suggestion.type);
                return (
                  <li key={suggestion.type} className="rounded border border-green-800/40 bg-black/40 p-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-green-100">{suggestion.type}</span>
                      <span className="text-green-400">{suggestion.state.toUpperCase()}</span>
                    </div>
                    <p className="mt-1 text-[0.7rem] text-green-300">{suggestion.reason}</p>
                    <div className="mt-2 flex items-center justify-between text-[0.7rem]">
                      <span>Confidence: {(suggestion.confidence * 100).toFixed(0)}%</span>
                      <button
                        onClick={() => applySignalSuggestion(suggestion)}
                        disabled={applied}
                        className="rounded bg-green-700 px-2 py-1 text-black disabled:cursor-not-allowed disabled:bg-green-900 disabled:text-green-500"
                      >
                        {applied ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                  </li>
                );
              })}
              {sortedSuggestions.length === 0 && (
                <li className="rounded border border-green-800/40 bg-black/40 p-2 text-[0.7rem] text-green-300">
                  No signal telemetry collected yet.
                </li>
              )}
            </ul>
          </div>
          <div>
            <h2 className="mb-2 text-sm font-semibold text-green-300">Encoding insight</h2>
            {encodingSuggestion ? (
              <div className="rounded border border-green-800/40 bg-black/40 p-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-100">Suggested: {encodingSuggestion.encoding.toUpperCase()}</span>
                  <span className="text-green-400">{(encodingSuggestion.confidence * 100).toFixed(0)}%</span>
                </div>
                <p className="mt-1 text-[0.7rem] text-green-300">{encodingSuggestion.reason}</p>
                <button
                  onClick={() => applyEncoding(encodingSuggestion)}
                  className="mt-2 w-full rounded bg-green-700 px-2 py-1 text-black"
                >
                  Apply encoding
                </button>
              </div>
            ) : (
              <p className="rounded border border-green-800/40 bg-black/40 p-2 text-[0.7rem] text-green-300">
                Waiting for data to analyse character encoding.
              </p>
            )}
            <p className="mt-2 text-[0.7rem] text-green-200">Active encoding: {encoding.toUpperCase()}</p>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default SerialTerminalApp;
export const displaySerialTerminal = () => <SerialTerminalApp />;

