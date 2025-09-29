import React, { useCallback, useState } from 'react';
import useNearViewportData from '@/hooks/useNearViewportData';

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

const APList: React.FC = () => {
  const [aps, setAps] = useState<AccessPoint[]>([]);

  const loadAps = useCallback(async () => {
    try {
      const response = await fetch('/demo-data/reaver/aps.json');
      const data: AccessPoint[] = await response.json();
      setAps(data);
    } catch {
      setAps([]);
    }
  }, []);

  const { ref: viewportRef, hasTriggered } = useNearViewportData<HTMLDivElement>(
    useCallback(() => {
      void loadAps();
    }, [loadAps]),
    { rootMargin: '35%' },
  );

  return (
    <div
      ref={viewportRef}
      className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4"
    >
      {aps.length === 0 && !hasTriggered ? (
        <div className="col-span-full text-sm text-gray-400">
          Preparing access point scan…
        </div>
      ) : (
        aps.map((ap) => (
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
        ))
      )}
    </div>
  );
};

export default APList;
