import { useEffect, useState } from 'react';
import { GridSkeleton } from '../../../components/base/Skeleton';

export interface AccessPoint {
  ssid: string;
  bssid: string;
  wps: 'enabled' | 'locked' | 'disabled';
}

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

const ListView: React.FC = () => {
  const [aps, setAps] = useState<AccessPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const controller = typeof AbortController !== 'undefined'
      ? new AbortController()
      : null;

    const load = async () => {
      try {
        setLoading(true);
        const response = await fetch('/demo-data/reaver/aps.json', {
          signal: controller?.signal,
        });
        if (!response.ok) {
          throw new Error('Failed to load access points');
        }
        const data = (await response.json()) as AccessPoint[];
        if (!cancelled) {
          setAps(Array.isArray(data) ? data : []);
        }
      } catch {
        if (!cancelled) {
          setAps([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      controller?.abort();
    };
  }, []);

  if (loading) {
    return (
      <section
        aria-label="Access point list"
        aria-busy="true"
        className="mb-4"
      >
        <GridSkeleton
          count={6}
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4"
          itemClassName="bg-gray-800 rounded p-3"
          mediaClassName="h-6 w-6 rounded-full"
          lines={2}
        />
        <span className="sr-only">Scanning for nearby access points</span>
      </section>
    );
  }

  return (
    <section
      aria-label="Access point list"
      aria-busy="false"
      className="mb-4"
    >
      {aps.length === 0 ? (
        <div className="text-sm text-gray-400">
          No access points discovered.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4">
          {aps.map((ap) => (
            <div
              key={ap.bssid}
              className="flex items-center justify-between bg-gray-800 rounded p-3"
            >
              <div>
                <div className="font-semibold">{ap.ssid}</div>
                <div className="text-xs font-mono text-gray-400">{ap.bssid}</div>
              </div>
              {statusIcon(ap.wps)}
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default ListView;
