import React, { useEffect, useMemo, useState } from 'react';
import fixturesCapture from './kismet/sampleCapture.json';
import fixturesClients from './kismet/sampleClients.json';
import ouiVendors from './kismet/oui.json';

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

const getVendor = (mac = '') => {
  const prefix = mac.slice(0, 8).toUpperCase();
  return ouiVendors[prefix] || 'Unknown vendor';
};

const aggregateFixtures = (capture, onNetwork) => {
  const map = {};
  const channelCounts = {};
  const timeCounts = {};
  const discoveredAt = Date.now();

  capture.forEach((entry, idx) => {
    const key = entry.bssid || `${entry.ssid}-${idx}`;
    if (!map[key]) {
      map[key] = {
        ssid: entry.ssid,
        bssid: entry.bssid || key,
        channel: entry.channel,
        frames: 0,
        signalSamples: [],
      };
      onNetwork?.({
        ssid: entry.ssid,
        bssid: entry.bssid || key,
        discoveredAt: discoveredAt + idx * 1000,
      });
    }
    map[key].frames += 1;
    if (typeof entry.signal === 'number') {
      map[key].signalSamples.push(entry.signal);
    }
    if (entry.channel != null) {
      channelCounts[entry.channel] = (channelCounts[entry.channel] || 0) + 1;
    }
    const bucket = Math.floor(idx / 2);
    timeCounts[bucket] = (timeCounts[bucket] || 0) + 1;
  });

  const networks = Object.values(map).map((net) => {
    const avgSignal = net.signalSamples.length
      ? Math.round(
          net.signalSamples.reduce((sum, value) => sum + value, 0) /
            net.signalSamples.length,
        )
      : undefined;
    return {
      ssid: net.ssid,
      bssid: net.bssid,
      channel: net.channel,
      frames: net.frames,
      vendor: getVendor(net.bssid),
      avgSignal,
    };
  });

  return { networks, channelCounts, timeCounts };
};

const annotateClients = (clients, networkLookup) =>
  clients.map((client) => {
    const vendor = getVendor(client.mac);
    const history = client.history.map((entry) => {
      const associated = networkLookup.get(entry.bssid);
      return {
        ...entry,
        channel: associated?.channel ?? null,
        vendor: associated?.vendor || getVendor(entry.bssid),
      };
    });
    return { ...client, vendor, history };
  });

const buildNetworkLookup = (nets) => {
  const map = new Map();
  nets.forEach((n) => {
    if (!map.has(n.bssid)) {
      map.set(n.bssid, n);
    }
  });
  return map;
};

const summarizeFixtures = (nets, counts) => {
  const totalNetworks = nets.length;
  const totalFrames = nets.reduce((sum, net) => sum + net.frames, 0);
  const busiestChannel = Object.keys(counts)
    .map(Number)
    .sort((a, b) => counts[b] - counts[a])[0];
  return {
    totalNetworks,
    totalFrames,
    busiestChannel,
  };
};

const KismetApp = ({ onNetworkDiscovered }) => {
  const [networks, setNetworks] = useState([]);
  const [networkSource, setNetworkSource] = useState('fixtures');
  const [channels, setChannels] = useState({});
  const [times, setTimes] = useState({});
  const [clients, setClients] = useState([]);
  const [channelFilter, setChannelFilter] = useState('all');
  const [deviceFilter, setDeviceFilter] = useState('all');
  const [labMode, setLabMode] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadLabMode = () => {
      try {
        const stored = localStorage.getItem('lab-mode');
        setLabMode(stored === 'true');
      } catch {
        setLabMode(false);
      }
    };
    loadLabMode();
  }, []);

  const applyDataset = (dataset, source = 'fixtures') => {
    const normalized = dataset.networks.map((net) => ({
      ...net,
      vendor: net.vendor || getVendor(net.bssid),
    }));
    setNetworks(normalized);
    setChannels(dataset.channelCounts);
    setTimes(dataset.timeCounts);
    setNetworkSource(source);
    const lookup = buildNetworkLookup(normalized);
    if (source === 'fixtures') {
      setClients(annotateClients(fixturesClients, lookup));
    } else {
      setClients([]);
    }
  };

  useEffect(() => {
    const dataset = aggregateFixtures(fixturesCapture, onNetworkDiscovered);
    applyDataset(dataset, 'fixtures');
  }, [onNetworkDiscovered]);

  const enableLabMode = () => {
    try {
      localStorage.setItem('lab-mode', 'true');
    } catch {
      /* ignore */
    }
    setLabMode(true);
  };

  const disableLabMode = () => {
    try {
      localStorage.removeItem('lab-mode');
    } catch {
      /* ignore */
    }
    setLabMode(false);
  };

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    try {
      const { networks, channelCounts, timeCounts } = parsePcap(
        buffer,
        onNetworkDiscovered,
      );
      applyDataset({ networks, channelCounts, timeCounts }, 'upload');
      setChannelFilter('all');
      setDeviceFilter('all');
      setError('');
    } catch (err) {
      setError('Unable to parse capture file.');
    }
  };

  const resetToFixtures = () => {
    const dataset = aggregateFixtures(fixturesCapture, onNetworkDiscovered);
    applyDataset(dataset, 'fixtures');
    setChannelFilter('all');
    setDeviceFilter('all');
    setError('');
  };

  const filteredNetworks = useMemo(() => {
    if (channelFilter === 'all') return networks;
    const ch = Number(channelFilter);
    return networks.filter((net) => net.channel === ch);
  }, [networks, channelFilter]);

  const filteredClients = useMemo(() => {
    return clients.filter((client) => {
      const vendorOk = deviceFilter === 'all' || client.vendor === deviceFilter;
      const channelOk =
        channelFilter === 'all' ||
        client.history.some((entry) => entry.channel === Number(channelFilter));
      return vendorOk && channelOk;
    });
  }, [clients, deviceFilter, channelFilter]);

  const vendorOptions = useMemo(() => {
    const set = new Set(clients.map((client) => client.vendor));
    return Array.from(set).sort();
  }, [clients]);

  const fixtureSummary = useMemo(
    () => summarizeFixtures(networks, channels),
    [networks, channels],
  );

  return (
    <div className="p-4 text-white space-y-4">
      <div
        className="rounded border border-yellow-700 bg-yellow-900/60 p-3 text-sm"
        role="status"
      >
        <div className="flex flex-wrap items-center gap-2 justify-between">
          <div>
            <p className="font-semibold">
              Lab Mode {labMode ? 'enabled' : 'off'}
            </p>
            <p className="text-xs text-yellow-200">
              {labMode
                ? 'All datasets stay local. Upload captures for guided review.'
                : 'Enable Lab Mode to explore the full simulator. Offline summary remains available.'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={labMode ? disableLabMode : enableLabMode}
              className="rounded bg-ub-yellow px-3 py-1 text-xs font-semibold text-black"
            >
              {labMode ? 'Disable Lab Mode' : 'Enable Lab Mode'}
            </button>
            <button
              type="button"
              onClick={resetToFixtures}
              className="rounded border border-yellow-500 px-3 py-1 text-xs"
            >
              Reload fixtures
            </button>
          </div>
        </div>
      </div>

      {!labMode && (
        <div className="rounded border border-blue-800 bg-blue-900/60 p-3 text-xs">
          <p className="font-semibold">Offline summary</p>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Access points discovered: {fixtureSummary.totalNetworks}</li>
            <li>Total beacon frames observed: {fixtureSummary.totalFrames}</li>
            <li>
              Busiest channel:{' '}
              {fixtureSummary.busiestChannel != null
                ? fixtureSummary.busiestChannel
                : 'n/a'}
            </li>
          </ul>
        </div>
      )}

      {labMode && (
        <>
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs" htmlFor="channel-filter">
              <span className="mb-1 block font-semibold">Channel filter</span>
              <select
                id="channel-filter"
                aria-label="Channel filter"
                className="w-32 rounded border border-white/20 bg-black/40 p-1 text-xs"
                value={channelFilter}
                onChange={(e) => setChannelFilter(e.target.value)}
              >
                <option value="all">All channels</option>
                {Object.keys(channels)
                  .map(Number)
                  .sort((a, b) => a - b)
                  .map((channel) => (
                    <option key={channel} value={channel}>
                      Channel {channel}
                    </option>
                  ))}
              </select>
            </label>

            {clients.length > 0 && (
              <label className="text-xs" htmlFor="device-filter">
                <span className="mb-1 block font-semibold">Device vendor</span>
                <select
                  id="device-filter"
                  aria-label="Device vendor filter"
                  className="w-40 rounded border border-white/20 bg-black/40 p-1 text-xs"
                  value={deviceFilter}
                  onChange={(e) => setDeviceFilter(e.target.value)}
                >
                  <option value="all">All vendors</option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor} value={vendor}>
                      {vendor}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="text-xs" htmlFor="pcap-upload">
              <span className="mb-1 block font-semibold">Upload capture</span>
              <input
                id="pcap-upload"
                type="file"
                accept=".pcap"
                onChange={handleFile}
                aria-label="pcap file"
                className="block text-xs"
              />
            </label>

            <div className="text-[10px] text-white/60">
              Dataset source: {networkSource === 'fixtures' ? 'Demo fixtures' : 'Upload'}
            </div>
          </div>

          {error && (
            <div className="rounded border border-red-700 bg-red-900/60 p-2 text-xs">
              {error}
            </div>
          )}

          {filteredNetworks.length > 0 ? (
            <table className="text-sm w-full" aria-label="Networks">
              <thead>
                <tr className="text-left">
                  <th className="pr-2">SSID</th>
                  <th className="pr-2">BSSID</th>
                  <th className="pr-2">Channel</th>
                  <th className="pr-2">Vendor</th>
                  <th>Frames</th>
                </tr>
              </thead>
              <tbody>
              {filteredNetworks.map((n) => (
                <tr key={n.bssid} className="odd:bg-gray-800">
                  <td className="pr-2">{n.ssid || '(hidden)'}</td>
                  <td className="pr-2">{n.bssid}</td>
                  <td className="pr-2">{n.channel ?? '-'}</td>
                  <td className="pr-2">{n.vendor}</td>
                  <td>{n.frames}</td>
                </tr>
              ))}
              </tbody>
            </table>
          ) : (
            <div className="rounded border border-white/20 p-3 text-xs text-white/70">
              No networks match the selected filters.
            </div>
          )}

          <div>
            <h3 className="font-bold mb-1">Channels</h3>
            <ChannelChart data={channels} />
          </div>

          <div>
            <h3 className="font-bold mb-1">Frames Over Time</h3>
            <TimeChart data={times} />
          </div>

          {clients.length > 0 && (
            <div>
              <h3 className="font-bold mb-1">Client devices</h3>
              <table className="w-full text-xs" aria-label="Client devices">
                <thead>
                  <tr className="text-left">
                    <th className="pr-2">MAC</th>
                    <th className="pr-2">Vendor</th>
                    <th>Known networks</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.mac} className="odd:bg-gray-800">
                      <td className="pr-2">{client.mac}</td>
                      <td className="pr-2">{client.vendor}</td>
                      <td>
                        <ul className="list-disc space-y-1 pl-4">
                          {client.history.map((entry, idx) => (
                            <li key={`${client.mac}-${idx}`}>
                              {entry.ssid || '(hidden)'} – {entry.bssid}
                              {entry.channel != null && (
                                <span className="text-white/60"> (ch {entry.channel})</span>
                              )}
                            </li>
                          ))}
                        </ul>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default KismetApp;

