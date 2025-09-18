import React, { useEffect, useMemo, useState } from 'react';

export interface AccessPoint {
  id: string;
  ssid: string;
  bssid: string;
  channel: number;
  security: 'Open' | 'WPA2' | 'WPA3' | 'WPA2/WPA3';
  wps: 'enabled' | 'locked' | 'disabled';
}

const MAX_APS = 12;

const ssidPrefixes = [
  'Home',
  'Office',
  'Corp',
  'Secure',
  'Guest',
  'IoT',
  'Lab',
  'Campus',
];

const ssidSuffixes = [
  'Net',
  'WLAN',
  'Mesh',
  'AP',
  'Zone',
  'Link',
  'Portal',
  'Bridge',
];

const securityModes: AccessPoint['security'][] = [
  'Open',
  'WPA2',
  'WPA3',
  'WPA2/WPA3',
];

const wpsStatuses: AccessPoint['wps'][] = ['enabled', 'locked', 'disabled'];

const randomFrom = <T,>(values: readonly T[]): T => {
  const idx = Math.floor(Math.random() * values.length);
  return values[idx];
};

const randomByte = () => Math.floor(Math.random() * 256)
  .toString(16)
  .padStart(2, '0');

let sequence = 0;

const generateBssid = () =>
  `${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}:${randomByte()}`;

const generateSsid = () =>
  `${randomFrom(ssidPrefixes)}-${randomFrom(ssidSuffixes)}-${
    10 + Math.floor(Math.random() * 90)
  }`;

const createAccessPoint = (): AccessPoint => ({
  id: `ap-${Date.now()}-${sequence++}`,
  ssid: generateSsid(),
  bssid: generateBssid(),
  channel: 1 + Math.floor(Math.random() * 11),
  security: randomFrom(securityModes),
  wps: randomFrom(wpsStatuses),
});

const waitForInterval = (delay: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const timeout = setTimeout(() => {
      signal.removeEventListener('abort', onAbort);
      resolve();
    }, delay);
    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', onAbort);
      resolve();
    };
    signal.addEventListener('abort', onAbort);
  });

const createAPGenerator = (
  intervalMs: number,
  signal: AbortSignal,
): AsyncGenerator<AccessPoint, void, void> => {
  const generator: AsyncGenerator<AccessPoint, void, void> = {
    async next(): Promise<IteratorResult<AccessPoint>> {
      if (signal.aborted) {
        return { value: undefined as unknown as AccessPoint, done: true };
      }
      await waitForInterval(intervalMs, signal);
      if (signal.aborted) {
        return { value: undefined as unknown as AccessPoint, done: true };
      }
      return { value: createAccessPoint(), done: false };
    },
    async return(): Promise<IteratorResult<AccessPoint>> {
      return { value: undefined as unknown as AccessPoint, done: true };
    },
    async throw(): Promise<IteratorResult<AccessPoint>> {
      return { value: undefined as unknown as AccessPoint, done: true };
    },
    [Symbol.asyncIterator]() {
      return this;
    },
  };
  return generator;
};

const LockOpen = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      d="M10 2a4 4 0 00-4 4v2a2 2 0 00-2 2v7a2 2 0 002 2h10a2 2 0 002-2V9a2 2 0 00-2-2h-5V6a2 2 0 114 0h2a4 4 0 00-4-4h-2z"
      clipRule="evenodd"
    />
  </svg>
);

const LockClosed = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      d="M5 8a5 5 0 1110 0v2a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2V8zm8-2a3 3 0 00-6 0v2h6V6z"
      clipRule="evenodd"
    />
  </svg>
);

const statusIcon = (status: AccessPoint['wps']) => {
  switch (status) {
    case 'enabled':
      return (
        <LockOpen className="w-6 h-6 text-green-400" aria-label="WPS enabled" />
      );
    case 'locked':
      return (
        <LockClosed className="w-6 h-6 text-yellow-400" aria-label="WPS locked" />
      );
    case 'disabled':
    default:
      return (
        <LockClosed className="w-6 h-6 text-red-400" aria-label="WPS disabled" />
      );
  }
};

const formatWpsStatus = (status: AccessPoint['wps']) =>
  status.charAt(0).toUpperCase() + status.slice(1);

interface APListProps {
  intervalMs: number;
  maxEntries?: number;
}

const APList: React.FC<APListProps> = ({ intervalMs, maxEntries = MAX_APS }) => {
  const [aps, setAps] = useState<AccessPoint[]>([]);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;
    const generator = createAPGenerator(intervalMs, controller.signal);

    setAps([]);
    setScanning(true);

    const consume = async () => {
      while (!cancelled && !controller.signal.aborted) {
        const { value, done } = await generator.next();
        if (cancelled || controller.signal.aborted || done || !value) {
          break;
        }
        setAps((prev) => {
          if (cancelled) {
            return prev;
          }
          const next = [...prev, value];
          if (next.length > maxEntries) {
            next.shift();
          }
          return next;
        });
      }
      if (!cancelled) {
        setScanning(false);
      }
    };

    consume();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [intervalMs, maxEntries]);

  const placeholderCount = useMemo(() => {
    if (!scanning) {
      return 0;
    }
    const remaining = maxEntries - aps.length;
    return Math.max(1, Math.min(3, remaining));
  }, [aps.length, maxEntries, scanning]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
      {aps.map((ap) => (
        <div
          key={ap.id}
          data-testid="ap-entry"
          className="flex items-center justify-between bg-gray-800 rounded p-3 border border-gray-700"
        >
          <div>
            <div className="font-semibold flex items-center gap-2">
              <span>{ap.ssid}</span>
              <span className="text-xs uppercase text-gray-400">{ap.security}</span>
            </div>
            <div className="text-xs font-mono text-gray-400">{ap.bssid}</div>
            <div className="text-xs text-gray-400">Channel {ap.channel}</div>
          </div>
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-gray-300">
            {statusIcon(ap.wps)}
            <span>WPS {formatWpsStatus(ap.wps)}</span>
          </div>
        </div>
      ))}
      {Array.from({ length: placeholderCount }).map((_, index) => (
        <div
          key={`skeleton-${index}`}
          data-testid="ap-skeleton"
          className="bg-gray-800 rounded p-3 border border-dashed border-gray-700 animate-pulse"
          aria-hidden="true"
        >
          <div className="h-4 bg-gray-700 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-700 rounded w-2/3 mb-2" />
          <div className="h-3 bg-gray-700 rounded w-1/2" />
        </div>
      ))}
    </div>
  );
};

export default APList;
