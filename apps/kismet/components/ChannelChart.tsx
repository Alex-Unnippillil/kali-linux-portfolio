'use client';

import React, { useMemo, useState } from 'react';
import sample from '../sampleCapture.json';

type Network = {
  ssid: string;
  bssid: string;
  channel: number;
  signal: number;
};

type Band = 'all' | '2.4GHz' | '5GHz';

const bandRanges: Record<Exclude<Band, 'all'>, [number, number]> = {
  '2.4GHz': [1, 14],
  '5GHz': [36, 165],
};

const ChannelChart: React.FC = () => {
  const [band, setBand] = useState<Band>('all');

  const channelCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    (sample as Network[]).forEach((n) => {
      counts[n.channel] = (counts[n.channel] || 0) + 1;
    });
    return counts;
  }, []);

  const channels = useMemo(() => {
    let chs = Object.keys(channelCounts)
      .map(Number)
      .sort((a, b) => a - b);
    if (band !== 'all') {
      const [min, max] = bandRanges[band];
      chs = chs.filter((c) => c >= min && c <= max);
    }
    return chs;
  }, [band, channelCounts]);

  const maxCount = Math.max(1, ...channels.map((c) => channelCounts[c] ?? 0));

  return (
    <div className="text-white">
      <div className="mb-2">
        <label htmlFor="band" className="mr-2 text-sm">
          Band:
        </label>
        <select
          id="band"
          value={band}
          onChange={(e) => setBand(e.target.value as Band)}
          className="bg-gray-800 border border-gray-700 text-sm"
        >
          <option value="all">All</option>
          <option value="2.4GHz">2.4GHz</option>
          <option value="5GHz">5GHz</option>
        </select>
      </div>
      <div className="flex items-end h-40 space-x-1" aria-live="polite">
        {channels.map((c) => {
          const count = channelCounts[c] ?? 0;
          const color = c <= bandRanges['2.4GHz'][1] ? 'bg-blue-600' : 'bg-green-600';
          return (
            <div key={c} className="flex flex-col items-center">
              <div
                className={`${color} w-4`}
                style={{ height: `${(count / maxCount) * 100}%` }}
                role="img"
                aria-label={`Channel ${c} has ${count} networks`}
              />
              <span className="text-xs mt-1">{c}</span>
            </div>
          );
        })}
      </div>
      <div className="flex space-x-4 text-xs mt-2">
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 bg-blue-600 block" />
          <span>2.4GHz</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-3 h-3 bg-green-600 block" />
          <span>5GHz</span>
        </div>
      </div>
    </div>
  );
};

export default ChannelChart;
