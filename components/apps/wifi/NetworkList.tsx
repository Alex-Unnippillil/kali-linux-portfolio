import React from 'react';
import type { WifiNetwork } from '../../../types/wifi';

interface NetworkListProps {
  networks: WifiNetwork[];
}

const formatLastSeen = (iso: string) => {
  const timestamp = new Date(iso).getTime();
  const diffSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (diffSeconds < 60) return `${diffSeconds}s ago`;
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  return `${Math.floor(diffSeconds / 3600)}h ago`;
};

const formatQuality = (signal: number) => {
  const normalized = Math.min(100, Math.max(0, 100 + signal));
  if (normalized >= 70) return 'Excellent';
  if (normalized >= 50) return 'Good';
  if (normalized >= 30) return 'Fair';
  return 'Weak';
};

const NetworkList: React.FC<NetworkListProps> = ({ networks }) => (
  <section aria-label="Discovered Wi-Fi networks" className="space-y-2">
    <h2 className="text-lg font-semibold text-white">Scan results</h2>
    <ul className="space-y-2" role="list">
      {networks.map((network) => (
        <li
          key={network.bssid}
          className="rounded-md border border-ubt-cool-grey/60 bg-black/30 p-3 text-sm text-ubt-grey"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-base font-semibold text-white">{network.ssid}</p>
              <p className="text-xs uppercase tracking-wide">{network.band} • Channel {network.channel}</p>
            </div>
            <div className="text-right text-xs">
              <p className="text-white">{formatQuality(network.signal)}</p>
              <p>{network.signal.toFixed(0)} dBm</p>
            </div>
          </div>
          <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <div>
              <dt className="uppercase tracking-wide text-[0.65rem]">Security</dt>
              <dd className="text-white">{network.security}</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-[0.65rem]">Channel width</dt>
              <dd className="text-white">{network.widthMHz} MHz</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-[0.65rem]">Utilisation</dt>
              <dd className="text-white">{Math.round(network.utilization * 100)}%</dd>
            </div>
            <div>
              <dt className="uppercase tracking-wide text-[0.65rem]">Last seen</dt>
              <dd className="text-white">{formatLastSeen(network.lastSeen)}</dd>
            </div>
          </dl>
        </li>
      ))}
    </ul>
  </section>
);

export default NetworkList;
