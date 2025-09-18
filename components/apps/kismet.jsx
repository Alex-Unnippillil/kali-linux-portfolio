import React, { useEffect, useState } from 'react';

const DEVICE_COLUMNS = [
  {
    id: 'ssid',
    label: 'SSID',
    getValue: (network) => network.ssid || '(hidden)',
    cellClassName: 'pr-2',
  },
  {
    id: 'bssid',
    label: 'BSSID',
    getValue: (network) => network.bssid,
    cellClassName: 'pr-2',
  },
  {
    id: 'channel',
    label: 'Channel',
    getValue: (network) => (network.channel ?? '-').toString(),
    cellClassName: 'pr-2',
  },
  {
    id: 'frames',
    label: 'Frames',
    getValue: (network) => network.frames,
  },
];

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

const KismetApp = ({ onNetworkDiscovered, onVisibleDataChange, exportToolbar }) => {
  const [networks, setNetworks] = useState([]);
  const [channels, setChannels] = useState({});
  const [times, setTimes] = useState({});

  useEffect(() => {
    onVisibleDataChange?.({ columns: DEVICE_COLUMNS, rows: networks });
  }, [networks, onVisibleDataChange]);

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
          {exportToolbar ? (
            <div className="flex justify-end mb-2">{exportToolbar}</div>
          ) : null}
          <table className="text-sm w-full" aria-label="Networks">
            <thead>
              <tr className="text-left">
                {DEVICE_COLUMNS.map((column) => (
                  <th key={column.id} className={column.cellClassName || ''}>
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {networks.map((n) => (
                <tr key={n.bssid} className="odd:bg-gray-800">
                  {DEVICE_COLUMNS.map((column) => (
                    <td key={column.id} className={column.cellClassName || ''}>
                      {column.getValue(n)}
                    </td>
                  ))}
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

