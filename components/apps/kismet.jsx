import React, { useMemo, useState } from 'react';

const WINDOW_MS = 60_000;
const MAX_HISTORY_MS = WINDOW_MS * 2;
const MAX_GRAPH_POINTS = 300;

const alignTo = (offset, alignment) => {
  if (alignment <= 1) return offset;
  const mod = offset % alignment;
  return mod === 0 ? offset : offset + (alignment - mod);
};

const RADIOTAP_FIELD_META = {
  0: { size: 8, align: 8 }, // TSFT
  1: { size: 1, align: 1 }, // Flags
  2: { size: 1, align: 1 }, // Rate
  3: { size: 4, align: 2 }, // Channel
  4: { size: 2, align: 2 }, // FHSS
  5: { size: 1, align: 1, signed: true }, // dBm Antenna Signal
  6: { size: 1, align: 1, signed: true }, // dBm Antenna Noise
  7: { size: 2, align: 2 }, // Lock Quality
  8: { size: 2, align: 2 }, // TX Attenuation
  9: { size: 2, align: 2 }, // dB TX Attenuation
  10: { size: 1, align: 1, signed: true }, // dBm TX Power
  11: { size: 1, align: 1 }, // Antenna
  12: { size: 1, align: 1 }, // dB Antenna Signal
  13: { size: 1, align: 1 }, // dB Antenna Noise
  14: { size: 2, align: 2 }, // RX Flags
  15: { size: 2, align: 2 }, // TX Flags
  16: { size: 1, align: 1 }, // RTS Retries
  17: { size: 1, align: 1 }, // Data Retries
  18: { size: 4, align: 4 }, // X Channel
  19: { size: 2, align: 2 }, // MCS
  20: { size: 1, align: 1 }, // AMPDU status
  21: { size: 1, align: 1 }, // VHT
  22: { size: 8, align: 8 }, // Timestamp
  23: { size: 8, align: 8 }, // HE
};

const pseudoRandom = (seed) => {
  let value = seed & 0x7fffffff;
  return () => {
    value = (value * 48271) % 0x7fffffff;
    return value / 0x7fffffff;
  };
};

const hashString = (value) =>
  Array.from(value).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) & 0x7fffffff, 1);

const createRssiSimulator = (bssid) => {
  const base = -45 - (hashString(bssid) % 25);
  const rand = pseudoRandom(hashString(bssid) || 1);
  return (previous) => {
    const baseline = Number.isFinite(previous) ? previous : base;
    const variance = rand() * 6 - 3; // +/-3 dBm wiggle
    const next = baseline + variance;
    return Math.max(-95, Math.min(-25, next));
  };
};

export const downsampleSeries = (points, maxPoints = MAX_GRAPH_POINTS) => {
  if (!Array.isArray(points) || points.length === 0) return [];
  if (points.length <= maxPoints) return points;

  if (maxPoints < 3) {
    return [points[0], points[points.length - 1]];
  }

  const result = [points[0]];
  const innerPoints = points.length - 2;
  const bucketCount = maxPoints - 2;
  const bucketSize = innerPoints / bucketCount;

  for (let bucketIndex = 0; bucketIndex < bucketCount; bucketIndex += 1) {
    const start = 1 + Math.floor(bucketIndex * bucketSize);
    const end = 1 + Math.floor((bucketIndex + 1) * bucketSize);
    const sliceEnd = Math.min(end + 1, points.length - 1);
    const bucket = points.slice(start, sliceEnd);
    if (bucket.length === 0) continue;
    const avg = bucket.reduce(
      (acc, point) => {
        acc.x += point.x;
        acc.y += point.y;
        return acc;
      },
      { x: 0, y: 0 },
    );
    result.push({ x: avg.x / bucket.length, y: avg.y / bucket.length });
  }

  result.push(points[points.length - 1]);

  if (result.length > maxPoints) {
    result.splice(maxPoints - 1, result.length - maxPoints);
    result[maxPoints - 1] = points[points.length - 1];
  }

  return result;
};

const extractRssi = (radiotapView) => {
  if (!radiotapView || radiotapView.byteLength < 8) return undefined;
  const dv = new DataView(
    radiotapView.buffer,
    radiotapView.byteOffset,
    radiotapView.byteLength,
  );
  const headerLength = dv.getUint16(2, true);
  if (headerLength > radiotapView.byteLength) return undefined;

  let presentOffset = 4;
  const presentWords = [];
  let present;
  do {
    if (presentOffset + 4 > headerLength) return undefined;
    present = dv.getUint32(presentOffset, true);
    presentWords.push(present);
    presentOffset += 4;
  } while (present & 0x80000000);

  let fieldOffset = presentOffset;
  let fieldIndex = 0;
  for (const word of presentWords) {
    for (let bit = 0; bit < 32; bit += 1, fieldIndex += 1) {
      const mask = 1 << bit;
      if (!(word & mask)) continue;

      if (bit === 31) {
        // Extended presence bit has no payload.
        continue;
      }

      const meta = RADIOTAP_FIELD_META[fieldIndex] || { size: 0, align: 1 };
      fieldOffset = alignTo(fieldOffset, meta.align || 1);
      if (fieldOffset + (meta.size || 0) > headerLength) {
        return undefined;
      }

      if (fieldIndex === 5 && meta.size) {
        return meta.signed ? dv.getInt8(fieldOffset) : dv.getUint8(fieldOffset);
      }

      fieldOffset += meta.size || 0;
    }
  }

  return undefined;
};

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
  const startPacket = packets[0];
  const startTimestamp = startPacket
    ? startPacket.tsSec * 1000 + Math.floor(startPacket.tsUsec / 1000)
    : 0;
  const simulators = {};

  for (const pkt of packets) {
    if (pkt.data.length < 4) continue;
    const rtLen = pkt.data[2] | (pkt.data[3] << 8);
    if (pkt.data.length < rtLen + 24) continue;
    const frame = pkt.data.subarray(rtLen);
    const rssi = extractRssi(pkt.data.subarray(0, rtLen));
    const fc = frame[0] | (frame[1] << 8);
    const type = (fc >> 2) & 0x3;
    const subtype = (fc >> 4) & 0xf;
    // Only management beacons/probe responses
    if (type !== 0 || (subtype !== 8 && subtype !== 5)) continue;

    const info = parseMgmtFrame(frame);
    const key = info.bssid || info.ssid;
    if (!networks[key]) {
      networks[key] = { ...info, frames: 0, rssiSeries: [] };
      simulators[key] = createRssiSimulator(key || 'unknown');
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
    const timestamp = pkt.tsSec * 1000 + Math.floor(pkt.tsUsec / 1000);
    const elapsed = timestamp - startTimestamp;
    const secondsBucket = Math.floor(elapsed / 1000);
    timeCounts[secondsBucket] = (timeCounts[secondsBucket] || 0) + 1;

    const series = networks[key].rssiSeries;
    const previous = series.length ? series[series.length - 1].rssi : undefined;
    const value = Number.isFinite(rssi) ? rssi : simulators[key](previous);
    series.push({ time: elapsed, rssi: value });
    while (series.length && elapsed - series[0].time > MAX_HISTORY_MS) {
      series.shift();
    }
  }

  return {
    networks: Object.values(networks),
    channelCounts,
    timeCounts,
  };
};

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

const RssiChart = ({ series }) => {
  const prepared = useMemo(() => {
    if (!Array.isArray(series) || series.length === 0) return [];
    const latest = series[series.length - 1].time;
    const windowStart = Math.max(0, latest - WINDOW_MS);
    const filtered = series.filter((point) => point.time >= windowStart);
    if (!filtered.length) return [];
    const normalized = filtered.map((point) => ({
      x: (point.time - windowStart) / WINDOW_MS,
      y: point.rssi,
    }));
    return downsampleSeries(normalized, MAX_GRAPH_POINTS);
  }, [series]);

  const width = 420;
  const height = 120;

  if (!prepared.length) {
    return (
      <div
        className="flex items-center justify-center h-32 text-xs text-gray-400 border border-dashed border-gray-700"
        role="img"
        aria-label="No RSSI data"
      >
        No RSSI samples captured
      </div>
    );
  }

  const min = Math.min(...prepared.map((p) => p.y));
  const max = Math.max(...prepared.map((p) => p.y));
  const range = max - min || 1;
  const path = prepared
    .map((point, index) => {
      const x = point.x * width;
      const y = height - ((point.y - min) / range) * height;
      return `${index === 0 ? 'M' : 'L'}${x} ${y}`;
    })
    .join(' ');

  const grid = [0.25, 0.5, 0.75].map((ratio) => (
    <line
      key={ratio}
      x1={0}
      x2={width}
      y1={height * ratio}
      y2={height * ratio}
      stroke="rgba(148, 163, 184, 0.2)"
      strokeWidth={1}
    />
  ));

  return (
    <svg
      width={width}
      height={height}
      role="img"
      aria-label="RSSI over time"
      className="bg-gray-900 border border-gray-800"
    >
      <rect width={width} height={height} fill="#111827" />
      {grid}
      <path d={path} stroke="#34d399" fill="none" strokeWidth={2} />
      <text
        x={8}
        y={16}
        className="fill-gray-400 text-[10px]"
      >
        {`Peak: ${Math.round(max)} dBm`}
      </text>
      <text
        x={8}
        y={height - 8}
        className="fill-gray-500 text-[10px]"
      >
        {`Floor: ${Math.round(min)} dBm`}
      </text>
    </svg>
  );
};

const KismetApp = ({ onNetworkDiscovered }) => {
  const [networks, setNetworks] = useState([]);
  const [channels, setChannels] = useState({});
  const [times, setTimes] = useState({});

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

  return (
    <div className="p-4 text-white space-y-4">
      <input
        type="file"
        accept=".pcap"
        onChange={handleFile}
        aria-label="pcap file"
        className="block"
      />

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

          <div>
            <h3 className="font-bold mb-2">RSSI Over Time (60s window)</h3>
            <div className="space-y-4">
              {networks.map((network) => (
                <div
                  key={network.bssid}
                  className="border border-gray-800 rounded-md p-3 bg-gray-950"
                >
                  <div className="flex flex-wrap justify-between text-xs text-gray-300 mb-2 gap-y-1">
                    <span>
                      <span className="text-gray-400">SSID:</span>{' '}
                      {network.ssid || '(hidden)'}
                    </span>
                    <span>
                      <span className="text-gray-400">BSSID:</span> {network.bssid}
                    </span>
                    <span>
                      <span className="text-gray-400">Channel:</span> {network.channel ?? '-'}
                    </span>
                    <span>
                      <span className="text-gray-400">Frames:</span> {network.frames}
                    </span>
                  </div>
                  <RssiChart series={network.rssiSeries} />
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default KismetApp;

export { parsePcap };

