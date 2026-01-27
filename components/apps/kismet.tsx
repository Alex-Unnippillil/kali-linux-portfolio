import React, { useEffect, useMemo, useState } from 'react';
import fixturesCapture from './kismet/sampleCapture.json';
import fixturesClients from './kismet/sampleClients.json';
import ouiVendors from './kismet/oui.json';

interface DiscoveredNetwork {
  ssid: string;
  bssid: string;
  discoveredAt: number;
}

type OnNetworkDiscovered = (network: DiscoveredNetwork) => void;

type ChannelCounts = Record<number, number>;

type TimeCounts = Record<number, number>;

interface NetworkRecord {
  ssid: string;
  bssid: string;
  channel?: number | null;
  frames: number;
  vendor?: string;
  avgSignal?: number;
}

interface NetworkDataset {
  networks: NetworkRecord[];
  channelCounts: ChannelCounts;
  timeCounts: TimeCounts;
}

interface FixtureEntry {
  ssid: string;
  bssid?: string;
  channel?: number | null;
  signal?: number;
}

interface ClientFixture {
  mac: string;
  history: Array<{ ssid?: string; bssid: string }>;
}

interface ClientHistoryEntry {
  ssid?: string;
  bssid: string;
  channel?: number | null;
  vendor?: string;
}

interface ClientRecord {
  mac: string;
  vendor: string;
  history: ClientHistoryEntry[];
}

interface PcapPacket {
  tsSec: number;
  tsUsec: number;
  data: Uint8Array;
}

interface NetworkState {
  ssid: string;
  bssid: string;
  channel?: number | null;
  frames: number;
  signalSamples: number[];
}

// Helper to convert bytes to MAC address string
const macToString = (bytes: Uint8Array) =>
  Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join(':');

// Parse a single 802.11 management frame (beacon/probe response)
const parseMgmtFrame = (frame: Uint8Array) => {
  const bssid = macToString(frame.slice(16, 22));
  let ssid = '';
  let channel: number | undefined;

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
const parsePcap = (arrayBuffer: ArrayBuffer, onNetwork?: OnNetworkDiscovered): NetworkDataset => {
  const dv = new DataView(arrayBuffer);
  const packets: PcapPacket[] = [];
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

  const networks: Record<string, NetworkState> = {};
  const channelCounts: ChannelCounts = {};
  const timeCounts: TimeCounts = {};
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
      networks[key] = { ...info, frames: 0, signalSamples: [] };
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

const ChannelChart = ({ data }: { data: ChannelCounts }) => {
  const channels = Object.keys(data)
    .map(Number)
    .sort((a, b) => a - b);
  const max = Math.max(1, ...channels.map((c) => data[c]));
  return (
    <div
      className="flex h-40 items-end space-x-1 text-kali-muted"
      aria-label="Channel chart"
    >
      {channels.map((channel) => (
        <div key={channel} className="flex flex-col items-center">
          <div
            className="w-4 rounded-sm bg-[var(--color-accent)]"
            style={{ height: `${(data[channel] / max) * 100}%` }}
          />
          <span className="mt-1 text-xs">{channel}</span>
        </div>
      ))}
    </div>
  );
};

const TimeChart = ({ data }: { data: TimeCounts }) => {
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
      className="bg-[color:var(--color-dark)]"
      aria-label="Time chart"
    >
      <path d={points} stroke="var(--color-accent)" strokeWidth={2} fill="none" />
    </svg>
  );
};

const getVendor = (mac = '') => {
  const prefix = mac.slice(0, 8).toUpperCase();
  return (ouiVendors as Record<string, string>)[prefix] || 'Unknown vendor';
};

const aggregateFixtures = (
  capture: FixtureEntry[],
  onNetwork?: OnNetworkDiscovered,
): NetworkDataset => {
  const map: Record<string, NetworkState> = {};
  const channelCounts: ChannelCounts = {};
  const timeCounts: TimeCounts = {};
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

const annotateClients = (
  clients: ClientFixture[],
  networkLookup: Map<string, NetworkRecord>,
): ClientRecord[] =>
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

const buildNetworkLookup = (nets: NetworkRecord[]) => {
  const map = new Map<string, NetworkRecord>();
  nets.forEach((network) => {
    if (!map.has(network.bssid)) {
      map.set(network.bssid, network);
    }
  });
  return map;
};

const summarizeFixtures = (nets: NetworkRecord[], counts: ChannelCounts) => {
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

interface KismetAppProps {
  onNetworkDiscovered?: OnNetworkDiscovered;
}

const KismetApp = ({ onNetworkDiscovered }: KismetAppProps) => {
  const [networks, setNetworks] = useState<NetworkRecord[]>([]);
  const [networkSource, setNetworkSource] = useState<'fixtures' | 'upload'>('fixtures');
  const [channels, setChannels] = useState<ChannelCounts>({});
  const [times, setTimes] = useState<TimeCounts>({});
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [channelFilter, setChannelFilter] = useState<string>('all');
  const [deviceFilter, setDeviceFilter] = useState<string>('all');
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

  const applyDataset = (dataset: NetworkDataset, source: 'fixtures' | 'upload' = 'fixtures') => {
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
      setClients(annotateClients(fixturesClients as ClientFixture[], lookup));
    } else {
      setClients([]);
    }
  };

  useEffect(() => {
    const dataset = aggregateFixtures(fixturesCapture as FixtureEntry[], onNetworkDiscovered);
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

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    try {
      const { networks: parsedNetworks, channelCounts, timeCounts } = parsePcap(
        buffer,
        onNetworkDiscovered,
      );
      applyDataset({ networks: parsedNetworks, channelCounts, timeCounts }, 'upload');
      setChannelFilter('all');
      setDeviceFilter('all');
      setError('');
    } catch (err) {
      setError('Unable to parse capture file.');
    }
  };

  const resetToFixtures = () => {
    const dataset = aggregateFixtures(fixturesCapture as FixtureEntry[], onNetworkDiscovered);
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
    <div className="space-y-6 p-4 text-[color:var(--kali-text)] lg:space-y-8">
      <div
        className="rounded-xl border border-kali-border/70 bg-[color:var(--kali-surface)] p-4 text-sm shadow-kali-panel"
        role="status"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <p className="text-base font-semibold uppercase tracking-wide text-kali-accent">
              Lab Mode {labMode ? 'enabled' : 'off'}
            </p>
            <p className="text-xs text-kali-muted">
              {labMode
                ? 'All datasets stay local. Upload captures for guided review.'
                : 'Enable Lab Mode to explore the full simulator. Offline summary remains available.'}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={labMode ? disableLabMode : enableLabMode}
              className="rounded-lg bg-[color:var(--color-accent)] px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-[color:var(--color-inverse)] shadow-sm transition hover:bg-[color:color-mix(in_srgb,var(--color-accent)_88%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              {labMode ? 'Disable Lab Mode' : 'Enable Lab Mode'}
            </button>
            <button
              type="button"
              onClick={resetToFixtures}
              className="rounded-lg border border-kali-border/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-kali-accent transition hover:bg-[color:color-mix(in_srgb,var(--color-accent)_12%,transparent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
            >
              Reload fixtures
            </button>
          </div>
        </div>
      </div>

      {!labMode && (
        <div className="rounded-xl border border-kali-border/70 bg-[color:var(--kali-surface)] p-4 text-xs shadow-kali-panel">
          <p className="text-sm font-semibold uppercase tracking-wide text-kali-accent">
            Offline summary
          </p>
          <ul className="mt-3 list-disc space-y-1 pl-5 text-[color:color-mix(in_srgb,var(--kali-text)_82%,transparent)]">
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
          <div className="flex flex-wrap items-end gap-4 rounded-xl border border-kali-border/60 bg-[color:var(--color-surface-muted)] p-4">
            <label className="text-xs" htmlFor="channel-filter">
              <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide">
                Channel filter
              </span>
              <select
                id="channel-filter"
                aria-label="Channel filter"
                className="w-36 rounded-lg border border-kali-border/60 bg-kali-dark p-1.5 text-xs text-[color:var(--kali-text)] shadow-sm focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                value={channelFilter}
                onChange={(event) => setChannelFilter(event.target.value)}
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
                <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide">
                  Device vendor
                </span>
                <select
                  id="device-filter"
                  aria-label="Device vendor filter"
                  className="w-44 rounded-lg border border-kali-border/60 bg-kali-dark p-1.5 text-xs text-[color:var(--kali-text)] shadow-sm focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                  value={deviceFilter}
                  onChange={(event) => setDeviceFilter(event.target.value)}
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
              <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide">
                Upload capture
              </span>
              <input
                id="pcap-upload"
                type="file"
                accept=".pcap"
                onChange={handleFile}
                aria-label="pcap file"
                className="block max-w-[14rem] text-xs"
              />
            </label>

            <div className="text-[10px] uppercase tracking-wide text-kali-muted">
              Dataset source: {networkSource === 'fixtures' ? 'Demo fixtures' : 'Upload'}
            </div>
          </div>

          {error && (
            <div
              className="rounded-lg border border-[color:color-mix(in_srgb,var(--color-error)_65%,transparent)] bg-[color:color-mix(in_srgb,var(--color-error)_16%,var(--kali-surface))] p-3 text-xs font-semibold uppercase tracking-wide text-[color:color-mix(in_srgb,var(--color-error)_75%,var(--kali-text))] shadow ring-1 ring-[color:color-mix(in_srgb,var(--color-error)_45%,transparent)]"
              role="alert"
              aria-live="assertive"
            >
              {error}
            </div>
          )}

          <div className="grid gap-6 xl:grid-cols-12">
            <section className="space-y-4 xl:col-span-7">
              {filteredNetworks.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-kali-border/60 bg-[color:var(--kali-surface)] shadow-kali-panel">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm" aria-label="Networks">
                      <thead className="bg-kali-dark/80 text-xs uppercase tracking-wide text-kali-muted">
                        <tr className="text-left">
                          <th className="px-4 py-3">SSID</th>
                          <th className="px-4 py-3">BSSID</th>
                          <th className="px-4 py-3">Channel</th>
                          <th className="px-4 py-3">Vendor</th>
                          <th className="px-4 py-3">Frames</th>
                        </tr>
                      </thead>
                      <tbody className="text-[color:color-mix(in_srgb,var(--kali-text)_92%,transparent)]">
                        {filteredNetworks.map((network) => (
                          <tr
                            key={network.bssid}
                            className="odd:bg-[color:var(--color-surface-muted)]"
                          >
                            <td className="px-4 py-2">{network.ssid || '(hidden)'}</td>
                            <td className="px-4 py-2 font-mono text-xs">{network.bssid}</td>
                            <td className="px-4 py-2">{network.channel ?? '-'}</td>
                            <td className="px-4 py-2">{network.vendor}</td>
                            <td className="px-4 py-2">{network.frames}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-kali-border/60 bg-[color:var(--color-surface-muted)] p-4 text-xs text-kali-muted">
                  No networks match the selected filters.
                </div>
              )}

              {clients.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-kali-border/60 bg-[color:var(--kali-surface)] shadow-kali-panel">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs" aria-label="Client devices">
                      <thead className="bg-kali-dark/80 uppercase tracking-wide text-kali-muted">
                        <tr className="text-left">
                          <th className="px-4 py-3">MAC</th>
                          <th className="px-4 py-3">Vendor</th>
                          <th className="px-4 py-3">Known networks</th>
                        </tr>
                      </thead>
                      <tbody className="text-[color:color-mix(in_srgb,var(--kali-text)_92%,transparent)]">
                        {filteredClients.map((client) => (
                          <tr
                            key={client.mac}
                            className="odd:bg-[color:var(--color-surface-muted)]"
                          >
                            <td className="px-4 py-2 font-mono text-[0.7rem]">
                              {client.mac}
                            </td>
                            <td className="px-4 py-2">{client.vendor}</td>
                            <td className="px-4 py-2">
                              <ul className="list-disc space-y-1 pl-4 text-[0.75rem]">
                                {client.history.map((entry, idx) => (
                                  <li key={`${client.mac}-${idx}`}>
                                    {entry.ssid || '(hidden)'} – {entry.bssid}
                                    {entry.channel != null && (
                                      <span className="text-kali-muted">
                                        {' '}
                                        (ch {entry.channel})
                                      </span>
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
                </div>
              )}
            </section>

            <aside className="space-y-4 xl:col-span-5">
              <div className="rounded-xl border border-kali-border/60 bg-[color:var(--kali-surface)] p-4 shadow-kali-panel">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-kali-accent">
                  Channel utilization
                </h3>
                <div className="overflow-x-auto pb-2">
                  <ChannelChart data={channels} />
                </div>
              </div>

              <div className="rounded-xl border border-kali-border/60 bg-[color:var(--kali-surface)] p-4 shadow-kali-panel">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-kali-accent">
                  Frames over time
                </h3>
                <div className="overflow-x-auto pb-2">
                  <TimeChart data={times} />
                </div>
              </div>
            </aside>
          </div>
        </>
      )}
    </div>
  );
};

export default KismetApp;
