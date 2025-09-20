'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import FormError from '../../ui/FormError';

type PresetKey = 'all' | 'http' | 'dns' | 'save';

type CaptureStatus =
  | 'idle'
  | 'initializing'
  | 'awaiting-elevation'
  | 'capturing'
  | 'saving'
  | 'saved'
  | 'stopped'
  | 'error';

interface StartConfig {
  interface: string;
  filters: string[];
  saveToFile: boolean;
}

interface ElevationPrompt {
  message: string;
  command?: string;
}

type WorkerEvent =
  | {
      type: 'status';
      payload: {
        status: Exclude<CaptureStatus, 'awaiting-elevation'>;
        message: string;
      };
    }
  | { type: 'log'; payload: string }
  | { type: 'needsElevation'; payload: ElevationPrompt }
  | { type: 'saved'; payload: { path: string; filename: string } }
  | { type: 'error'; payload: string };

const INTERFACES = [
  { id: 'eth0', label: 'Ethernet (eth0)' },
  { id: 'wlan0', label: 'Wi-Fi (wlan0)' },
  { id: 'lo', label: 'Loopback (lo)' },
];

const PRESETS: { key: PresetKey; label: string; description: string }[] = [
  {
    key: 'all',
    label: 'All interfaces',
    description: 'Use aggregated monitoring across available adapters.',
  },
  {
    key: 'http',
    label: 'HTTP',
    description: 'Apply tcp port 80 or tcp port 443 filter.',
  },
  {
    key: 'dns',
    label: 'DNS',
    description: 'Apply udp port 53 filter to isolate lookups.',
  },
  {
    key: 'save',
    label: 'Save to file',
    description: 'Store capture output in ~/Documents/Captures.',
  },
];

const describeInterface = (iface: string) => {
  if (iface === 'any') return 'all interfaces';
  const found = INTERFACES.find((it) => it.id === iface);
  return found ? found.label : iface;
};

const presetButtonClasses = (active: boolean) =>
  `rounded border px-3 py-2 text-left transition focus:outline-none focus:ring-2 focus:ring-ub-yellow ${
    active
      ? 'border-ub-yellow bg-ub-yellow/20 text-ub-yellow'
      : 'border-ub-cool-grey/60 text-white hover:border-ub-yellow/40 hover:text-ub-yellow'
  }`;

const PacketCapture = () => {
  const [presetState, setPresetState] = useState<Record<PresetKey, boolean>>({
    all: true,
    http: false,
    dns: false,
    save: true,
  });
  const [selectedInterface, setSelectedInterface] = useState<string>(
    INTERFACES[0].id,
  );
  const [status, setStatus] = useState<CaptureStatus>('idle');
  const [statusMessage, setStatusMessage] = useState<string>(
    'Ready to capture packets.',
  );
  const [error, setError] = useState<string>('');
  const [logs, setLogs] = useState<string[]>([]);
  const [needsElevation, setNeedsElevation] = useState<ElevationPrompt | null>(
    null,
  );
  const [savedFile, setSavedFile] = useState<string>('');
  const [pendingConfig, setPendingConfig] = useState<StartConfig | null>(null);
  const workerRef = useRef<Worker | null>(null);

  const interfaceForCapture = presetState.all ? 'any' : selectedInterface;

  const filterExpressions = useMemo(() => {
    const filters: string[] = [];
    if (presetState.http) {
      filters.push('tcp port 80 or tcp port 443');
    }
    if (presetState.dns) {
      filters.push('udp port 53');
    }
    return filters;
  }, [presetState.dns, presetState.http]);

  const filterSummary = filterExpressions.length
    ? filterExpressions.join(' or ')
    : 'No capture filter applied';

  const appendLog = (message: string) => {
    const entry = `[${new Date().toLocaleTimeString()}] ${message}`;
    setLogs((prev) => [...prev.slice(-199), entry]);
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const worker = new Worker(
      new URL('../../../workers/packetCapture.ts', import.meta.url),
    );
    workerRef.current = worker;
    worker.onmessage = (event: MessageEvent<WorkerEvent>) => {
      const msg = event.data;
      switch (msg.type) {
        case 'status': {
          const nextStatus = msg.payload.status as CaptureStatus;
          setStatus(nextStatus);
          setStatusMessage(msg.payload.message);
          if (nextStatus === 'error') {
            setError(msg.payload.message);
            setPendingConfig(null);
            setNeedsElevation(null);
          } else {
            setError('');
          }
          if (nextStatus === 'saved' || nextStatus === 'stopped') {
            setPendingConfig(null);
            setNeedsElevation(null);
          }
          break;
        }
        case 'log': {
          appendLog(msg.payload);
          break;
        }
        case 'needsElevation': {
          setNeedsElevation(msg.payload);
          setStatus('awaiting-elevation');
          setStatusMessage(msg.payload.message);
          appendLog(msg.payload.message);
          break;
        }
        case 'saved': {
          setSavedFile(msg.payload.path);
          appendLog(`Capture stored at ${msg.payload.path}`);
          break;
        }
        case 'error': {
          setError(msg.payload);
          setStatus('error');
          setStatusMessage(msg.payload);
          appendLog(`Error: ${msg.payload}`);
          break;
        }
        default:
          break;
      }
    };
    return () => {
      worker.terminate();
    };
  }, []);

  const togglePreset = (key: PresetKey) => {
    setPresetState((prev) => {
      const next = { ...prev };
      if (key === 'all') {
        next[key] = !prev[key];
        return next;
      }
      next[key] = !prev[key];
      return next;
    });
  };

  const startCapture = () => {
    if (!workerRef.current) return;
    const config: StartConfig = {
      interface: interfaceForCapture,
      filters: filterExpressions,
      saveToFile: presetState.save,
    };
    setPendingConfig(config);
    setStatus('initializing');
    setStatusMessage('Requesting capture session...');
    setError('');
    setNeedsElevation(null);
    setSavedFile('');
    appendLog(`Starting capture on ${describeInterface(config.interface)}.`);
    workerRef.current.postMessage({ type: 'start', payload: config });
  };

  const stopCapture = () => {
    if (!workerRef.current) return;
    workerRef.current.postMessage({ type: 'stop' });
    appendLog('Stop requested by user.');
  };

  const confirmElevation = () => {
    if (!workerRef.current || !pendingConfig) return;
    appendLog('Elevation acknowledged. Continuing capture startup.');
    setNeedsElevation(null);
    setStatus('initializing');
    setStatusMessage('Retrying with elevated privileges...');
    workerRef.current.postMessage({
      type: 'start',
      payload: { ...pendingConfig, acknowledgedElevation: true },
    });
  };

  const cancelElevation = () => {
    appendLog('Capture cancelled before elevation.');
    setNeedsElevation(null);
    setPendingConfig(null);
    setStatus('idle');
    setStatusMessage(
      'Capture cancelled. Elevation is required for that interface.',
    );
  };

  const openInWireshark = () => {
    if (!savedFile) return;
    appendLog(`Demo hand-off: would open ${savedFile} in Wireshark.`);
    setStatusMessage(
      'Wireshark launch simulated. Install desktop integration to enable it.',
    );
  };

  const startDisabled =
    status === 'initializing' ||
    status === 'awaiting-elevation' ||
    status === 'capturing' ||
    status === 'saving';

  const stopDisabled =
    status !== 'initializing' && status !== 'capturing' && status !== 'saving';

  return (
    <div className="flex h-full w-full flex-col bg-ub-dark text-white">
      <header className="border-b border-ub-cool-grey/60 px-4 py-3">
        <h1 className="text-lg font-semibold">Packet Capture</h1>
        <p className="text-xs text-ubt-grey">
          Simulated capture control panel with elevation checks and Wireshark
          hand-off.
        </p>
      </header>
      <div className="flex flex-1 flex-col gap-4 overflow-hidden p-4 text-sm">
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded border border-ub-cool-grey/50 bg-black/40 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
              Capture presets
            </h2>
            <p className="mt-1 text-xs text-ubt-grey">
              Toggle presets to build a capture session. All operations remain
              inside this demo environment.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  type="button"
                  onClick={() => togglePreset(preset.key)}
                  className={presetButtonClasses(presetState[preset.key])}
                >
                  <span className="block text-sm font-semibold">
                    {preset.label}
                  </span>
                  <span className="mt-1 block text-xs text-ubt-grey">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
            {!presetState.all && (
              <label className="mt-4 block text-xs uppercase text-ubt-grey">
                Interface
                <select
                  value={selectedInterface}
                  onChange={(event) => setSelectedInterface(event.target.value)}
                  className="mt-1 w-full rounded border border-ub-cool-grey/60 bg-black/60 p-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-ub-yellow"
                >
                  {INTERFACES.map((iface) => (
                    <option key={iface.id} value={iface.id}>
                      {iface.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <dl className="mt-4 space-y-2 text-xs text-ubt-grey">
              <div className="flex items-start justify-between gap-2">
                <dt className="uppercase tracking-wide">Target</dt>
                <dd className="text-right text-white">
                  {describeInterface(interfaceForCapture)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="uppercase tracking-wide">Filters</dt>
                <dd className="text-right text-white">{filterSummary}</dd>
              </div>
              <div className="flex items-start justify-between gap-2">
                <dt className="uppercase tracking-wide">Storage</dt>
                <dd className="text-right text-white">
                  {presetState.save ? '~/Documents/Captures' : 'Disabled'}
                </dd>
              </div>
            </dl>
          </section>

          <section className="flex flex-col rounded border border-ub-cool-grey/50 bg-black/40 p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
              Session
            </h2>
            <p className="mt-1 text-xs text-ubt-grey">
              Status: <span className="text-white">{statusMessage}</span>
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={startCapture}
                disabled={startDisabled}
                className={`rounded bg-ub-green px-4 py-2 text-sm font-semibold text-black transition disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Start capture
              </button>
              <button
                type="button"
                onClick={stopCapture}
                disabled={stopDisabled}
                className="rounded bg-ub-red px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
              >
                Stop capture
              </button>
            </div>
            {needsElevation && (
              <div className="mt-4 rounded border border-yellow-500 bg-yellow-900/40 p-3 text-xs text-yellow-200">
                <p className="font-semibold">Elevation required</p>
                <p className="mt-1">{needsElevation.message}</p>
                {needsElevation.command && (
                  <pre className="mt-2 overflow-x-auto rounded bg-black/40 p-2 text-[11px] text-yellow-100">
                    {needsElevation.command}
                  </pre>
                )}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={confirmElevation}
                    className="rounded bg-yellow-400 px-3 py-1 text-xs font-semibold text-black"
                  >
                    Continue with sudo (demo)
                  </button>
                  <button
                    type="button"
                    onClick={cancelElevation}
                    className="rounded border border-yellow-300 px-3 py-1 text-xs font-semibold text-yellow-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
            {error && <FormError className="mt-4">{error}</FormError>}
            {savedFile && (
              <div className="mt-4 rounded border border-ub-cool-grey/60 bg-black/60 p-3 text-xs">
                <p className="font-semibold text-ubt-grey">Capture saved</p>
                <p className="mt-1 font-mono text-[11px] text-white">
                  {savedFile}
                </p>
                <button
                  type="button"
                  onClick={openInWireshark}
                  className="mt-3 rounded bg-ub-cool-grey px-3 py-1 text-xs font-semibold text-white"
                >
                  Open in Wireshark (demo)
                </button>
              </div>
            )}
          </section>
        </div>

        <section className="flex min-h-[10rem] flex-1 flex-col rounded border border-ub-cool-grey/50 bg-black/60 p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ubt-grey">
            Activity log
          </h2>
          <div className="mt-2 flex-1 overflow-y-auto bg-black/60 p-3 text-xs font-mono text-ubt-grey">
            {logs.length === 0 ? (
              <p className="text-ubt-grey">
                No capture activity yet. Start a capture to generate demo
                output.
              </p>
            ) : (
              <ul className="space-y-1">
                {logs.map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default PacketCapture;
export const displayPacketCapture = () => <PacketCapture />;
