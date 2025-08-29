import React, { useEffect, useState } from 'react';

export interface AccessPoint {
  ssid: string;
  bssid: string;
  wps: 'enabled' | 'locked' | 'disabled';
}

const CheckCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
      clipRule="evenodd"
    />
  </svg>
);

const XCircle = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-11.707a1 1 0 00-1.414-1.414L10 8.586 7.707 6.293a1 1 0 10-1.414 1.414L8.586 10l-2.293 2.293a1 1 0 101.414 1.414L10 11.414l2.293 2.293a1 1 0 001.414-1.414L11.414 10l2.293-2.293z"
      clipRule="evenodd"
    />
  </svg>
);

const LockClosed = (props: React.SVGProps<SVGSVGElement>) => (
  <svg viewBox="0 0 20 20" fill="currentColor" {...props}>
    <path
      fillRule="evenodd"
      d="M5 8a5 5 0 1110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2V8zm8-1a3 3 0 10-6 0v1h6V7z"
      clipRule="evenodd"
    />
  </svg>
);

const statusIcon = (status: AccessPoint['wps']) => {
  switch (status) {
    case 'enabled':
      return (
        <span className="text-green-400" aria-label="WPS enabled">
          <CheckCircle className="w-5 h-5" />
        </span>
      );
    case 'locked':
      return (
        <span className="text-yellow-400" aria-label="WPS locked">
          <LockClosed className="w-5 h-5" />
        </span>
      );
    case 'disabled':
    default:
      return (
        <span className="text-red-400" aria-label="WPS disabled">
          <XCircle className="w-5 h-5" />
        </span>
      );
  }
};

const APList: React.FC = () => {
  const [aps, setAps] = useState<AccessPoint[]>([]);

  useEffect(() => {
    fetch('/demo-data/reaver/aps.json')
      .then((r) => r.json())
      .then(setAps)
      .catch(() => setAps([]));
  }, []);

  return (
    <table className="w-full text-sm mb-4">
      <thead>
        <tr className="text-left">
          <th className="pb-2">SSID</th>
          <th className="pb-2">BSSID</th>
          <th className="pb-2">WPS</th>
        </tr>
      </thead>
      <tbody>
        {aps.map((ap) => (
          <tr key={ap.bssid} className="odd:bg-gray-800">
            <td className="py-1 px-2">{ap.ssid}</td>
            <td className="py-1 px-2 font-mono">{ap.bssid}</td>
            <td className="py-1 px-2">{statusIcon(ap.wps)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default APList;
