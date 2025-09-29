import React, { useEffect, useMemo, useRef, useState } from 'react';
import sampleChannelScan from './kismet/sampleCapture.json';

// Helper to convert bytes to MAC address string
const macToString = (bytes) =>
  Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join(':');

// Parse a single 802.11 management frame (beacon/probe response)
const parseMgmtFrame = (frame) => {
  const bssid = macToString(frame.slice(16, 22));
  let ssid = '';
  let channel;

  // Skip header (24 bytes) + fixed params (12 bytes)
  let off = 36;
  while (off + 2 <= frame.length) {
    const tag = frame[off];
    const len = frame[off + 1];
    const data = frame.slice(off + 2, off + 2 + len);
    if (tag === 0) {
      ssid = new TextDecoder().decode(data);
    } else if (tag === 3 && data.length) {
      channel = data[0];
    }
    off += 2 + len;
  }

  return { ssid, bssid, channel };
};

// Parse packets from a pcap ArrayBuffer
const parsePcap = (arrayBuffer, onNetwork) => {
  const dv = new DataView(arrayBuffer);
  const packets = [];
  let offset = 24; // global header
  while (offset + 16 <= dv.byteLength) {
    const tsSec = dv.getUint32(offset, true);
    const tsUsec = dv.getUint32(offset + 4, true);
    const inclLen = dv.getUint32(offset + 8, true);
    offset += 16;
    const data = new Uint8Array(arrayBuffer, offset, inclLen);
    packets.push({ tsSec, tsUsec, data });
    offset += inclLen;
  }

  const networks = {};
  const channelCounts = {};
  const timeCounts = {};
  const startTime = packets[0]?.tsSec || 0;

  for (const pkt of packets) {
    if (pkt.data.length < 4) continue;
    const rtLen = pkt.data[2] | (pkt.data[3] << 8);
    if (pkt.data.length < rtLen + 24) continue;
    const frame = pkt.data.subarray(rtLen);
    const fc = frame[0] | (frame[1] << 8);
    const type = (fc >> 2) & 0x3;
    const subtype = (fc >> 4) & 0xf;
    // Only management beacons/probe responses
    if (type !== 0 || (subtype !== 8 && subtype !== 5)) continue;

    const info = parseMgmtFrame(frame);
    const key = info.bssid || info.ssid;
    if (!networks[key]) {
      networks[key] = { ...info, frames: 0 };
      onNetwork?.({
        ssid: info.ssid,
        bssid: info.bssid,
        discoveredAt: pkt.tsSec * 1000 + Math.floor(pkt.tsUsec / 1000),
      });
    }
    networks[key].frames += 1;
    if (info.channel != null) {
      channelCounts[info.channel] = (channelCounts[info.channel] || 0) + 1;
    }
    const t = pkt.tsSec - startTime;
    timeCounts[t] = (timeCounts[t] || 0) + 1;
  }

  return {
    networks: Object.values(networks),
    channelCounts,
    timeCounts,
  };
};

const CONGESTION_THRESHOLDS = {
  elevated: 0.6,
  severe: 0.85,
};

const SCAN_REFRESH_MS = 500;
const SCAN_WINDOW_SIZE = 8;

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

const ChannelMeter = ({ loads }) => {
  const channels = useMemo(
    () =>
      Object.keys(loads)
        .map(Number)
        .sort((a, b) => a - b),
    [loads],
  );

  const maxLoad = useMemo(
    () => Math.max(1, ...channels.map((channel) => loads[channel] || 0)),
    [channels, loads],
  );

  if (!channels.length) {
    return (
      <p className="text-sm text-gray-400" data-testid="channel-meter-empty">
        Awaiting channel scan data…
      </p>
    );
  }

  return (
    <div className="space-y-2" aria-label="Channel congestion meter">
      {channels.map((channel) => {
        const load = loads[channel] || 0;
        const ratio = Math.min(1, load / maxLoad);
        let level = 'clear';
        if (ratio >= CONGESTION_THRESHOLDS.severe) {
          level = 'severe';
        } else if (ratio >= CONGESTION_THRESHOLDS.elevated) {
          level = 'crowded';
        }

        const levelStyles = {
          clear: 'border-emerald-500/60',
          crowded: 'border-amber-400',
          severe: 'border-red-500',
        };

        const barStyles = {
          clear: 'bg-emerald-500',
          crowded: 'bg-amber-400',
          severe: 'bg-red-500 animate-pulse',
        };

        return (
          <div
            key={channel}
            className={`rounded border px-3 py-2 transition-colors ${levelStyles[level]}`}
            data-testid={`channel-meter-${channel}`}
            data-congestion-level={level}
          >
            <div className="flex items-center justify-between text-xs uppercase tracking-wide">
              <span>Ch {channel}</span>
              <span>{load} sightings</span>
            </div>
            <div className="mt-2 h-2 w-full rounded-full bg-gray-800">
              <div
                className={`h-full rounded-full transition-all duration-300 ${barStyles[level]}`}
                style={{ width: `${Math.max(4, ratio * 100)}%` }}
                aria-label={`Channel ${channel} congestion ${level}`}
              />
            </div>
            <p className="mt-1 text-[10px] uppercase text-gray-400">Status: {level}</p>
          </div>
        );
      })}
    </div>
  );
};

const KismetApp = ({ onNetworkDiscovered, initialChannelScan }) => {
  const [networks, setNetworks] = useState([]);
  const [channels, setChannels] = useState({});
  const [times, setTimes] = useState({});
  const [scanData, setScanData] = useState(
    Array.isArray(initialChannelScan) && initialChannelScan.length
      ? initialChannelScan
      : sampleChannelScan,
  );
  const [channelLoads, setChannelLoads] = useState({});
  const scanIndexRef = useRef(0);
  const scanWindowRef = useRef([]);

  useEffect(() => {
    if (!Array.isArray(initialChannelScan) || !initialChannelScan.length) {
      return;
    }
    setScanData(initialChannelScan);
  }, [initialChannelScan]);

  useEffect(() => {
    if (!scanData?.length) {
      setChannelLoads({});
      return undefined;
    }

    scanIndexRef.current = 0;
    scanWindowRef.current = [];
    setChannelLoads({});

    const intervalId = setInterval(() => {
      const item = scanData[scanIndexRef.current];
      scanIndexRef.current = (scanIndexRef.current + 1) % scanData.length;

      scanWindowRef.current = [...scanWindowRef.current, item];
      if (scanWindowRef.current.length > SCAN_WINDOW_SIZE) {
        scanWindowRef.current.shift();
      }

      const nextLoads = scanWindowRef.current.reduce((acc, entry) => {
        if (entry && typeof entry.channel === 'number') {
          acc[entry.channel] = (acc[entry.channel] || 0) + 1;
        }
        return acc;
      }, {});

      setChannelLoads(nextLoads);
    }, SCAN_REFRESH_MS);

    return () => clearInterval(intervalId);
  }, [scanData]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const { networks, channelCounts, timeCounts } = parsePcap(
      buffer,
      onNetworkDiscovered,
    );
    setNetworks(networks);
    setChannels(channelCounts);
    setTimes(timeCounts);
  };

  const handleChannelScanFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        setScanData(parsed);
      }
    } catch (err) {
      console.warn('Failed to parse channel scan', err);
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

      <div className="space-y-2">
        <label className="block text-sm font-semibold" htmlFor="channel-scan-input">
          Channel scan JSON
        </label>
        <input
          id="channel-scan-input"
          type="file"
          accept="application/json"
          onChange={handleChannelScanFile}
          className="block text-sm"
          aria-label="channel scan file"
        />
      </div>

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

      <div>
        <h3 className="font-bold mb-1">Channel Congestion</h3>
        <ChannelMeter loads={channelLoads} />
      </div>
    </div>
  );
};

export default KismetApp;

