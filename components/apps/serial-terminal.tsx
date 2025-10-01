import React, { useEffect, useState, useRef } from 'react';
import FormError from '../ui/FormError';

type SerialParity = 'none' | 'even' | 'odd';
type SerialFlowControl = 'none' | 'hardware';

interface SerialOptions {
  baudRate: number;
  dataBits?: number;
  parity?: SerialParity;
  stopBits?: number;
  flowControl?: SerialFlowControl;
}

interface SerialPort {
  readonly readable: ReadableStream<Uint8Array> | null;
  open(options: SerialOptions): Promise<void>;
  close(): Promise<void>;
}

interface Serial {
  requestPort(): Promise<SerialPort>;
  addEventListener(type: 'disconnect', listener: (ev: Event & { readonly target: SerialPort }) => void): void;
  removeEventListener(type: 'disconnect', listener: (ev: Event & { readonly target: SerialPort }) => void): void;
}

type NavigatorSerial = Navigator & { serial: Serial };

interface SerialConfig {
  baudRate: number;
  dataBits: number;
  parity: SerialParity;
  stopBits: number;
  flowControl: SerialFlowControl;
}

interface SerialPreset {
  name: string;
  config: SerialConfig;
}

const DEFAULT_CONFIG: SerialConfig = {
  baudRate: 9600,
  dataBits: 8,
  parity: 'none',
  stopBits: 1,
  flowControl: 'none',
};

const STORAGE_KEY = 'serial-terminal-presets';

const SerialTerminalApp: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'serial' in navigator;
  const [port, setPort] = useState<SerialPort | null>(null);
  const [logs, setLogs] = useState('');
  const [error, setError] = useState('');
  const [config, setConfig] = useState<SerialConfig>(DEFAULT_CONFIG);
  const [activeConfig, setActiveConfig] = useState<SerialConfig | null>(null);
  const [presetName, setPresetName] = useState('');
  const [selectedPreset, setSelectedPreset] = useState('');
  const [presets, setPresets] = useState<SerialPreset[]>([]);
  const readerRef = useRef<ReadableStreamDefaultReader<string> | null>(null);

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (!stored) return;
      const parsed: unknown = JSON.parse(stored);
      if (!Array.isArray(parsed)) return;
      const validPresets: SerialPreset[] = parsed
        .filter((item): item is SerialPreset => {
          if (!item || typeof item !== 'object') return false;
          const candidate = item as Partial<SerialPreset>;
          const cfg = candidate.config as Partial<SerialConfig> | undefined;
          return (
            typeof candidate.name === 'string' &&
            cfg !== undefined &&
            typeof cfg.baudRate === 'number' &&
            typeof cfg.dataBits === 'number' &&
            typeof cfg.parity === 'string' &&
            typeof cfg.stopBits === 'number' &&
            typeof cfg.flowControl === 'string'
          );
        })
        .map((item) => ({
          name: item.name,
          config: {
            baudRate: item.config.baudRate,
            dataBits: item.config.dataBits,
            parity: item.config.parity as SerialParity,
            stopBits: item.config.stopBits,
            flowControl: item.config.flowControl as SerialFlowControl,
          },
        }));
      if (validPresets.length) {
        setPresets(validPresets);
      }
    } catch {
      // ignore malformed storage
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      if (presets.length) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // ignore write errors
    }
  }, [presets]);

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
      const p = await (navigator as NavigatorSerial).serial.requestPort();
      const configToUse = { ...config };
      await p.open({
        baudRate: configToUse.baudRate,
        dataBits: configToUse.dataBits,
        parity: configToUse.parity,
        stopBits: configToUse.stopBits,
        flowControl: configToUse.flowControl,
      });
      setPort(p);
      setActiveConfig(configToUse);
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
      setActiveConfig(null);
    }
  };

  const updateConfigField = <K extends keyof SerialConfig>(key: K, value: SerialConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const savePreset = () => {
    const trimmed = presetName.trim();
    if (!trimmed) {
      setError('Preset name is required.');
      return;
    }
    setPresetName(trimmed);
    setError('');
    setPresets((prev) => {
      const existingIndex = prev.findIndex((preset) => preset.name === trimmed);
      const updatedPreset: SerialPreset = {
        name: trimmed,
        config: { ...config },
      };
      if (existingIndex >= 0) {
        const copy = [...prev];
        copy[existingIndex] = updatedPreset;
        return copy;
      }
      return [...prev, updatedPreset];
    });
    setSelectedPreset(trimmed);
  };

  const handlePresetSelect = (value: string) => {
    setSelectedPreset(value);
    const preset = presets.find((item) => item.name === value);
    if (preset) {
      setConfig({ ...preset.config });
      setError('');
    }
  };

  const describeConfig = (cfg: SerialConfig) =>
    `Baud ${cfg.baudRate}, Data ${cfg.dataBits}, Parity ${cfg.parity}, Stop ${cfg.stopBits}, Flow ${cfg.flowControl}`;

  return (
    <div className="relative h-full w-full bg-black p-4 text-green-400 font-mono">
      <div className="mb-4 flex flex-wrap items-end gap-3">
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
        <div className="flex flex-col text-xs text-gray-200">
          <label htmlFor="serial-preset-name">Preset Name</label>
          <input
            id="serial-preset-name"
            value={presetName}
            onChange={(e) => setPresetName(e.target.value)}
            className="mt-1 rounded bg-gray-800 px-2 py-1 text-sm text-white placeholder:text-gray-500"
            placeholder="My Device"
            aria-label="Preset Name"
          />
        </div>
        <button onClick={savePreset} className="rounded bg-blue-700 px-2 py-1 text-white">
          Save Preset
        </button>
        {presets.length > 0 && (
          <div className="flex flex-col text-xs text-gray-200">
            <label htmlFor="serial-preset-select">Presets</label>
            <select
              id="serial-preset-select"
              value={selectedPreset}
              onChange={(e) => handlePresetSelect(e.target.value)}
              className="mt-1 rounded bg-gray-800 px-2 py-1 text-sm text-white"
              aria-label="Presets"
            >
              <option value="">Select a preset</option>
              {presets.map((preset) => (
                <option key={preset.name} value={preset.name}>
                  {preset.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
      {!supported && (
        <p className="mb-2 text-sm text-yellow-400">
          Web Serial API not supported in this browser.
        </p>
      )}
      {error && <FormError className="mb-2 mt-0">{error}</FormError>}
      <div className="mb-3 grid gap-3 sm:grid-cols-2 md:grid-cols-3">
        <div className="flex flex-col text-xs text-gray-200">
          <label htmlFor="serial-baud-rate">Baud Rate</label>
          <input
            id="serial-baud-rate"
            type="number"
            min={110}
            max={921600}
            value={config.baudRate}
            onChange={(e) => updateConfigField('baudRate', Number.parseInt(e.target.value, 10) || DEFAULT_CONFIG.baudRate)}
            className="mt-1 rounded bg-gray-800 px-2 py-1 text-sm text-white"
            aria-label="Baud Rate"
          />
        </div>
        <div className="flex flex-col text-xs text-gray-200">
          <label htmlFor="serial-data-bits">Data Bits</label>
          <select
            id="serial-data-bits"
            value={config.dataBits}
            onChange={(e) => updateConfigField('dataBits', Number.parseInt(e.target.value, 10) as SerialConfig['dataBits'])}
            className="mt-1 rounded bg-gray-800 px-2 py-1 text-sm text-white"
            aria-label="Data Bits"
          >
            {[5, 6, 7, 8].map((bits) => (
              <option key={bits} value={bits}>
                {bits}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col text-xs text-gray-200">
          <label htmlFor="serial-parity">Parity</label>
          <select
            id="serial-parity"
            value={config.parity}
            onChange={(e) => updateConfigField('parity', e.target.value as SerialParity)}
            className="mt-1 rounded bg-gray-800 px-2 py-1 text-sm text-white"
            aria-label="Parity"
          >
            {(['none', 'even', 'odd'] as SerialParity[]).map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col text-xs text-gray-200">
          <label htmlFor="serial-stop-bits">Stop Bits</label>
          <select
            id="serial-stop-bits"
            value={config.stopBits}
            onChange={(e) => updateConfigField('stopBits', Number.parseInt(e.target.value, 10) as SerialConfig['stopBits'])}
            className="mt-1 rounded bg-gray-800 px-2 py-1 text-sm text-white"
            aria-label="Stop Bits"
          >
            {[1, 2].map((bits) => (
              <option key={bits} value={bits}>
                {bits}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col text-xs text-gray-200">
          <label htmlFor="serial-flow-control">Flow Control</label>
          <select
            id="serial-flow-control"
            value={config.flowControl}
            onChange={(e) => updateConfigField('flowControl', e.target.value as SerialFlowControl)}
            className="mt-1 rounded bg-gray-800 px-2 py-1 text-sm text-white"
            aria-label="Flow Control"
          >
            {['none', 'hardware'].map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>
      {port && activeConfig && (
        <p className="mb-2 text-sm text-green-300">{`Connected with ${describeConfig(activeConfig)}`}</p>
      )}
      <pre className="h-[calc(100%-4rem)] overflow-auto whitespace-pre-wrap break-words">
        {logs || 'No data'}
      </pre>
    </div>
  );
};

export default SerialTerminalApp;
export const displaySerialTerminal = () => <SerialTerminalApp />;

