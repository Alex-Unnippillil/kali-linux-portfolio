'use client';

import React, { useMemo, useState } from 'react';
import {
  PacketSummary,
  TopTalkerDatum,
  useTopTalkers,
} from '../../../components/apps/wireshark/hooks';

interface TopTalkersPanelProps {
  packets: PacketSummary[];
  isVisible: boolean;
  className?: string;
  updateInterval?: number;
  chunkSize?: number;
  limit?: number;
}

const formatBytes = (bytes: number) => {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024))
  );
  const value = bytes / 1024 ** exponent;
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[exponent]}`;
};

const ChartSection: React.FC<{
  title: string;
  color: string;
  data: TopTalkerDatum[];
}> = ({ title, color, data }) => {
  const maxBytes = useMemo(
    () => data.reduce((max, entry) => Math.max(max, entry.totalBytes), 0),
    [data]
  );

  return (
    <section className="space-y-2">
      <header className="flex items-center justify-between text-xs text-gray-300 uppercase">
        <span>{title}</span>
        {maxBytes > 0 && (
          <span className="text-[10px] text-gray-400">
            Peak {formatBytes(maxBytes)}
          </span>
        )}
      </header>
      {data.length === 0 ? (
        <p className="text-xs text-gray-500">No packet data yet.</p>
      ) : (
        <ul className="space-y-2">
          {data.map((entry) => {
            const percentage = maxBytes ? (entry.totalBytes / maxBytes) * 100 : 0;
            return (
              <li key={entry.id} className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-gray-300">
                  <span className="truncate" title={entry.id}>
                    {entry.id}
                  </span>
                  <span>
                    {formatBytes(entry.totalBytes)} · {entry.packetCount} pkt
                    {entry.packetCount === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="h-3 rounded bg-gray-800 overflow-hidden">
                  <div
                    className={`h-full ${color}`}
                    style={{ width: `${percentage}%` }}
                    aria-hidden="true"
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
};

const TopTalkersPanel: React.FC<TopTalkersPanelProps> = ({
  packets,
  isVisible,
  className = '',
  updateInterval = 750,
  chunkSize = 25,
  limit = 5,
}) => {
  const [paused, setPaused] = useState(false);
  const { sources, destinations } = useTopTalkers(packets, {
    active: isVisible && !paused,
    interval: updateInterval,
    chunkSize,
    limit,
  });

  const containerClasses = useMemo(
    () =>
      [
        'flex flex-col bg-gray-900 border-l border-gray-800/70 transition-all duration-200 overflow-hidden flex-shrink-0',
        isVisible ? 'w-80 opacity-100' : 'w-0 opacity-0 pointer-events-none',
        className,
      ]
        .filter(Boolean)
        .join(' '),
    [className, isVisible]
  );

  return (
    <aside className={containerClasses} aria-hidden={!isVisible}>
      <header className="flex items-center justify-between px-3 py-2 border-b border-gray-800/80 text-xs text-gray-200">
        <h2 className="font-semibold tracking-wide">Top Talkers</h2>
        <label className="inline-flex items-center space-x-2 cursor-pointer select-none">
          <input
            type="checkbox"
            className="form-checkbox h-3 w-3"
            checked={paused}
            onChange={(event) => setPaused(event.target.checked)}
            aria-label="Pause charts"
          />
          <span>Pause charts</span>
        </label>
      </header>
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        <ChartSection title="Top sources" color="bg-blue-500" data={sources} />
        <ChartSection
          title="Top destinations"
          color="bg-emerald-500"
          data={destinations}
        />
      </div>
    </aside>
  );
};

export default TopTalkersPanel;
