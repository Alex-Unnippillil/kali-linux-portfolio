import React, { useCallback, useEffect, useRef, useState } from 'react';
import FormError from '../ui/FormError';
import useDynamicVirtualizer from '../../hooks/useDynamicVirtualizer';

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
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState('');
  const logContainerRef = useRef<HTMLDivElement | null>(null);

  const estimateLogSize = useCallback(() => 24, []);

  const { virtualizer: logVirtualizer, measureElement: measureLogElement } =
    useDynamicVirtualizer<HTMLDivElement>({
      count: log.length,
      estimateSize: estimateLogSize,
      overscan: 6,
      scrollRef: logContainerRef,
    });

  useEffect(() => {
    logVirtualizer.measure();
    if (log.length === 0) return;
    logVirtualizer.scrollToIndex(log.length - 1, { align: 'end' });
  }, [log.length, logVirtualizer]);

  const handleConnect = async () => {
    if (useMock || !supported) {
      setConnected(true);
      setLog((l) => [...l, 'Connected to mock device']);
      return;
    }
    try {
      const d = await (navigator as NavigatorUSB).usb.requestDevice({ filters: [] });
      await d.open();
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
        setLog((l) => [...l, 'Device disconnected']);
      });
      setDevice(d);
      setConnected(true);
      setError('');
      setLog((l) => [...l, `Connected to ${d.productName ?? 'device'}`]);
    } catch (err) {
      const e = err as DOMException;
      if (e.name === 'NotFoundError') {
        setError('No device selected.');
      } else if (e.name === 'NotAllowedError') {
        setError('Permission to access USB was denied.');
      } else {
        setError(e.message || 'An unknown error occurred.');
      }
    }
  };

  const handleDisconnect = async () => {
    if (useMock) {
      setConnected(false);
      setLog((l) => [...l, 'Disconnected']);
      return;
    }
    if (device) {
      await device.close();
    }
    setConnected(false);
    setDevice(null);
    setLog((l) => [...l, 'Disconnected']);
  };

  const sendMessage = async () => {
    if (!connected) return;
    if (useMock) {
      setLog((l) => [...l, `> ${message}`, `< ${message}`]);
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
      setLog((l) => [...l, `> ${message}`, `< ${text.trim()}`]);
      setMessage('');
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const toggleMock = () => {
    setUseMock((v) => !v);
    setLog([]);
    setError('');
    setConnected(false);
  };

  return (
    <div className="relative h-full w-full bg-black p-4 text-white">
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={connected ? handleDisconnect : handleConnect}
          className="rounded bg-blue-600 px-3 py-1 disabled:opacity-50"
        >
          {connected ? 'Disconnect' : 'Connect'}
        </button>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={useMock}
            onChange={toggleMock}
            disabled={!supported}
          />
          Use Mock
        </label>
        {!supported && (
          <span className="text-sm text-yellow-400">WebUSB not supported</span>
        )}
      </div>
      {error && <FormError className="mb-4 mt-0">{error}</FormError>}
      <div className="mb-4 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Message"
          disabled={!connected}
          className="flex-1 rounded bg-gray-800 p-2 text-white disabled:opacity-50"
        />
        <button
          onClick={sendMessage}
          disabled={!connected || !message}
          className="rounded bg-green-600 px-3 py-1 disabled:opacity-50"
        >
          Send
        </button>
      </div>
      <div
        ref={logContainerRef}
        className="h-[calc(100%-8rem)] overflow-auto rounded bg-gray-800 p-2 text-sm"
        role="log"
        aria-live="polite"
      >
        {log.length === 0 ? (
          <p className="text-xs text-gray-300">No data</p>
        ) : (
          <div style={{ height: logVirtualizer.getTotalSize(), position: 'relative' }}>
            {logVirtualizer.getVirtualItems().map((virtualRow) => {
              const line = log[virtualRow.index];
              if (!line) return null;
              return (
                <p
                  key={virtualRow.key}
                  ref={measureLogElement}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className="whitespace-pre-wrap break-words"
                  aria-setsize={log.length}
                  aria-posinset={virtualRow.index + 1}
                >
                  {line}
                </p>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default WebUSBApp;
export const displayWebUSB = () => <WebUSBApp />;

