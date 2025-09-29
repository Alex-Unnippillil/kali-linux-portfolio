import React, { useCallback, useEffect, useState } from 'react';
import FormError from '../ui/FormError';

interface USBEndpoint {
  direction: 'in' | 'out';
  endpointNumber: number;
}

interface USBAlternateInterface {
  endpoints: USBEndpoint[];
}

interface USBInterface {
  alternates: USBAlternateInterface[];
}

interface USBConfiguration {
  interfaces: USBInterface[];
}

interface USBDevice {
  productName?: string;
  configuration: USBConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(value: number): Promise<void>;
  claimInterface(index: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<void>;
  transferIn(endpointNumber: number, length: number): Promise<{ data?: DataView }>;
  addEventListener(type: 'disconnect', listener: () => void): void;
}

interface USB {
  requestDevice(options: { filters: any[] }): Promise<USBDevice>;
}

type NavigatorUSB = Navigator & { usb: USB };

const WebUSBApp: React.FC = () => {
  const supported = typeof navigator !== 'undefined' && 'usb' in navigator;
  const [useMock, setUseMock] = useState(!supported);
  const [device, setDevice] = useState<USBDevice | null>(null);
  const [inEndpoint, setInEndpoint] = useState<number | null>(null);
  const [outEndpoint, setOutEndpoint] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'prompt' | 'connecting' | 'connected' | 'error'>(
    'idle'
  );
  const [showPreflight, setShowPreflight] = useState(false);
  const [acknowledgedPreflight, setAcknowledgedPreflight] = useState(false);
  const [busy, setBusy] = useState(false);

  const appendLog = useCallback((entry: string) => {
    setLogs((prev) => {
      const next = [...prev, entry];
      return next.slice(-40);
    });
  }, []);

  useEffect(() => {
    if (!supported) {
      const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
      const message = `WebUSB unsupported. UA: ${ua}`;
      appendLog(message);
      if (typeof console !== 'undefined') {
        console.info(message);
      }
    }
  }, [appendLog, supported]);

  const startConnection = useCallback(async () => {
    if (useMock || !supported) {
      setConnected(true);
      setStatus('connected');
      appendLog('Connected to mock USB device.');
      return;
    }

    setBusy(true);
    setStatus('connecting');
    setError('');
    appendLog('Requesting USB device selection.');
    try {
      const d = await (navigator as NavigatorUSB).usb.requestDevice({ filters: [] });
      const openPromise = d.open();
      const timeout = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out')), 10000)
      );
      await Promise.race([openPromise, timeout]);
      if (d.configuration === null) {
        await d.selectConfiguration(1);
      }
      await d.claimInterface(0);
      const alt = d.configuration?.interfaces[0].alternates[0];
      const epIn = alt?.endpoints.find((e) => e.direction === 'in');
      const epOut = alt?.endpoints.find((e) => e.direction === 'out');
      setInEndpoint(epIn?.endpointNumber ?? null);
      setOutEndpoint(epOut?.endpointNumber ?? null);
      d.addEventListener('disconnect', () => {
        setConnected(false);
        setDevice(null);
        setStatus('error');
        appendLog('USB device disconnected.');
      });
      setDevice(d);
      setConnected(true);
      setStatus('connected');
      setError('');
      appendLog(`Connected to ${d.productName ?? 'device'}.`);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotFoundError') {
        setError('No device selected.');
      } else if (e.name === 'NotAllowedError') {
        setError('Permission to access USB was denied.');
      } else {
        setError((err as Error).message || 'An unknown error occurred.');
      }
      setStatus('error');
      appendLog(`USB connection failed: ${(err as Error).message || e.name || 'Unknown error'}`);
    } finally {
      setBusy(false);
    }
  }, [appendLog, supported, useMock]);

  const handleConnect = useCallback(() => {
    if (busy) return;
    if (!acknowledgedPreflight) {
      setShowPreflight(true);
      setStatus('prompt');
      return;
    }
    void startConnection();
  }, [acknowledgedPreflight, busy, startConnection]);

  const handleDisconnect = useCallback(async () => {
    if (busy) return;
    if (useMock) {
      setConnected(false);
      setStatus('idle');
      appendLog('Disconnected from mock device.');
      return;
    }
    if (device) {
      await device.close();
    }
    setConnected(false);
    setDevice(null);
    setStatus('idle');
    appendLog('Disconnected from device.');
  }, [busy, device, useMock, appendLog]);

  const confirmPreflight = useCallback(() => {
    setAcknowledgedPreflight(true);
    setShowPreflight(false);
    void startConnection();
  }, [startConnection]);

  const cancelPreflight = useCallback(() => {
    setShowPreflight(false);
    setStatus('idle');
    appendLog('USB connect cancelled at preflight dialog.');
  }, [appendLog]);

  const statusLabels: Record<'idle' | 'prompt' | 'connecting' | 'connected' | 'error', string> = {
    idle: 'Idle',
    prompt: 'Awaiting confirmation',
    connecting: 'Connecting',
    connected: 'Connected',
    error: 'Needs attention',
  };

  const sendMessage = async () => {
    if (!connected) return;
    if (useMock) {
      setLogs((l) => [...l, `> ${message}`, `< ${message}`]);
      setMessage('');
      return;
    }
    if (!device || inEndpoint === null || outEndpoint === null) {
      setError('Device not ready.');
      return;
    }
    try {
      const encoder = new TextEncoder();
      const decoder = new TextDecoder();
      await device.transferOut(outEndpoint, encoder.encode(message + '\n'));
      const result = await device.transferIn(inEndpoint, 64);
      const text = decoder.decode(result.data);
      setLogs((l) => [...l, `> ${message}`, `< ${text.trim()}`]);
      setMessage('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleMock = () => {
    setUseMock((v) => !v);
    setLogs([]);
    setError('');
    setConnected(false);
    setStatus('idle');
    appendLog('Toggled mock mode.');
  };

  return (
    <div className="relative flex h-full w-full flex-col bg-black p-4 text-white">
      {showPreflight && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded bg-gray-900 p-4 shadow-lg">
            <h2 className="mb-2 text-lg font-bold" data-locale-key="connections.preflight.title">
              Before we connect
            </h2>
            <p className="text-sm text-gray-200" data-locale-key="connections.preflight.usbSummary">
              This tool will ask for permission to access a USB device so it can list endpoints and echo test messages inside this simulator.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-200">
              <li data-locale-key="connections.preflight.localOnly">
                Data stays on this page and remains only in your browser; nothing is sent to external services.
              </li>
              <li data-locale-key="connections.preflight.usbFallback">
                If USB access is unavailable, enable mock mode or connect through a Chromium-based browser on desktop.
              </li>
              <li data-locale-key="connections.preflight.retry">
                You can retry the connection if the device was busy or locked.
              </li>
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={cancelPreflight}
                className="rounded bg-gray-700 px-3 py-1 text-sm"
                data-locale-key="connections.preflight.cancel"
              >
                Cancel
              </button>
              <button
                onClick={confirmPreflight}
                className="rounded bg-blue-600 px-3 py-1 text-sm"
                data-locale-key="connections.preflight.continue"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <button
          onClick={connected ? handleDisconnect : handleConnect}
          className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
          disabled={busy}
          data-locale-key={
            connected ? 'connections.actions.disconnect' : 'connections.actions.connect'
          }
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={useMock}
              onChange={toggleMock}
              disabled={!supported}
              aria-label="Toggle mock USB device"
              data-locale-key="connections.mockToggleAria"
            />
            <span data-locale-key="connections.mockToggle">Use Mock</span>
          </label>
        <p className="text-xs text-gray-300" data-locale-key="connections.status" aria-live="polite">
          Status: {statusLabels[status]}
        </p>
      </div>
      {!supported && (
        <span className="mb-2 text-sm text-yellow-400" data-locale-key="connections.usbUnsupported">
          WebUSB is not supported in this browser.
        </span>
      )}
      {status === 'error' && !busy && !connected && (
        <button
          onClick={handleConnect}
          className="mb-2 self-start rounded border border-blue-400 px-3 py-1 text-sm"
          data-locale-key="connections.actions.retryConnect"
        >
          Retry Connection
        </button>
      )}
      {error && <FormError className="mb-4 mt-0">{error}</FormError>}
      <div className="mb-4 flex gap-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message"
            disabled={!connected}
            className="flex-1 rounded bg-gray-800 p-2 text-white disabled:opacity-50"
            aria-label="USB message"
            data-locale-key="connections.usbMessageLabel"
          />
        <button
          onClick={sendMessage}
          disabled={!connected || !message}
          className="rounded bg-green-600 px-3 py-1 disabled:opacity-50"
        >
          Send
        </button>
      </div>
      <div className="h-[calc(100%-8rem)] overflow-auto rounded bg-gray-800 p-2 text-sm">
        {logs.length === 0 ? (
          <p className="text-gray-400" data-locale-key="connections.log.empty">
            Activity log will appear here.
          </p>
        ) : (
          logs.map((line, idx) => <p key={`${line}-${idx}`}>{line}</p>)
        )}
      </div>
    </div>
  );
};

export default WebUSBApp;
export const displayWebUSB = () => <WebUSBApp />;

