import React, { startTransition, useState } from 'react';
import { analyzeWifiCapture } from '../../utils/pcap';

const ChannelChart = ({ data }) => {
  const channels = Object.keys(data)
    .map(Number)
    .sort((a, b) => a - b);
  const max = Math.max(1, ...channels.map((c) => data[c]));
  return (
    <div className="flex items-end h-40 space-x-1" aria-label="Channel chart">
      {channels.map((c) => (
        <div key={c} className="flex flex-col items-center">
          <div
            className="bg-blue-600 w-4"
            style={{ height: `${(data[c] / max) * 100}%` }}
          />
          <span className="text-xs mt-1">{c}</span>
        </div>
      ))}
    </div>
  );
};

const TimeChart = ({ data }) => {
  const times = Object.keys(data)
    .map(Number)
    .sort((a, b) => a - b);
  const max = Math.max(1, ...times.map((t) => data[t]));
  const width = Math.max(200, times.length * 20);
  const height = 100;
  const points = times
    .map((t, i) => {
      const x = (i / Math.max(1, times.length - 1)) * width;
      const y = height - (data[t] / max) * height;
      return `${i === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');

  return (
    <svg
      width={width}
      height={height}
      className="bg-gray-900"
      aria-label="Time chart"
    >
      <path d={points} stroke="#0f0" fill="none" />
    </svg>
  );
};

const KismetApp = ({ onNetworkDiscovered }) => {
  const [networks, setNetworks] = useState([]);
  const [channels, setChannels] = useState({});
  const [times, setTimes] = useState({});
  const [error, setError] = useState('');

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const result = await analyzeWifiCapture(buffer);
      startTransition(() => {
        setNetworks(result.networks);
        setChannels(result.channelCounts);
        setTimes(result.timeCounts);
      });
      result.discoveries.forEach((net) => onNetworkDiscovered?.(net));
      setError('');
    } catch (err) {
      setError(err.message || 'Unsupported capture format');
    }
  };

  return (
    <div className="p-4 text-white space-y-4">
      <input
        type="file"
        accept=".pcap"
        onChange={handleFile}
        aria-label="pcap file"
        className="block"
      />

      {error && (
        <div role="alert" className="text-sm text-red-400">
          {error}
        </div>
      )}

      {networks.length > 0 && (
        <>
          <table className="text-sm w-full" aria-label="Networks">
            <thead>
              <tr className="text-left">
                <th className="pr-2">SSID</th>
                <th className="pr-2">BSSID</th>
                <th className="pr-2">Channel</th>
                <th>Frames</th>
              </tr>
            </thead>
            <tbody>
              {networks.map((n) => (
                <tr key={n.bssid} className="odd:bg-gray-800">
                  <td className="pr-2">{n.ssid || '(hidden)'}</td>
                  <td className="pr-2">{n.bssid}</td>
                  <td className="pr-2">{n.channel ?? '-'}</td>
                  <td>{n.frames}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div>
            <h3 className="font-bold mb-1">Channels</h3>
            <ChannelChart data={channels} />
          </div>

          <div>
            <h3 className="font-bold mb-1">Frames Over Time</h3>
            <TimeChart data={times} />
          </div>
        </>
      )}
    </div>
  );
};

export default KismetApp;

