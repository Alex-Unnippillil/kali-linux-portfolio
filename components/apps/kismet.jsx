import React, { useEffect, useMemo, useState } from 'react';
import fixturesCapture from './kismet/sampleCapture.json';
import fixturesClients from './kismet/sampleClients.json';
import fixtureLocations from './kismet/sampleLocations.json';
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
    <div
      className="flex h-40 items-end space-x-1 text-kali-muted"
      aria-label="Channel chart"
    >
      {channels.map((c) => (
        <div key={c} className="flex flex-col items-center">
          <div
            className="w-4 rounded-sm bg-[var(--color-accent)]"
            style={{ height: `${(data[c] / max) * 100}%` }}
          />
          <span className="mt-1 text-xs">{c}</span>
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
      className="bg-[color:var(--color-dark)]"
      aria-label="Time chart"
    >
      <path d={points} stroke="var(--color-accent)" strokeWidth={2} fill="none" />
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
        signal: associated?.avgSignal ?? null,
      };
    });
    const strongest = history.reduce((acc, entry) => {
      if (typeof entry.signal !== 'number') return acc;
      if (acc == null) return entry.signal;
      return Math.max(acc, entry.signal);
    }, null);
    return {
      ...client,
      vendor,
      type: client.type || 'Unknown',
      strongestSignal: strongest,
      history,
    };
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

const DEVICE_BADGE_STYLES = {
  Laptop: {
    label: 'Laptop',
    className:
      'border-emerald-400/55 bg-emerald-500/15 text-emerald-100 motion-safe:transition-colors',
  },
  Smartphone: {
    label: 'Smartphone',
    className:
      'border-sky-400/55 bg-sky-500/15 text-sky-100 motion-safe:transition-colors',
  },
  IoT: {
    label: 'IoT',
    className:
      'border-amber-400/55 bg-amber-500/15 text-amber-100 motion-safe:transition-colors',
  },
  'Lab AP': {
    label: 'Lab AP',
    className:
      'border-fuchsia-400/55 bg-fuchsia-500/15 text-fuchsia-100 motion-safe:transition-colors',
  },
  'Public AP': {
    label: 'Public AP',
    className:
      'border-cyan-400/55 bg-cyan-500/15 text-cyan-100 motion-safe:transition-colors',
  },
  'Private AP': {
    label: 'Private AP',
    className:
      'border-slate-300/55 bg-slate-200/10 text-slate-100 motion-safe:transition-colors',
  },
  Backhaul: {
    label: 'Backhaul',
    className:
      'border-purple-400/55 bg-purple-500/15 text-purple-100 motion-safe:transition-colors',
  },
};

const getDeviceBadgeClass = (type) =>
  DEVICE_BADGE_STYLES[type]?.className ||
  'border-slate-400/55 bg-slate-500/10 text-slate-100 motion-safe:transition-colors';

const getDeviceBadgeLabel = (type) => DEVICE_BADGE_STYLES[type]?.label || type || 'Unknown';

const describeSignal = (signal) => {
  if (signal == null) return 'Signal unknown';
  if (signal >= -50) return `Strong (${signal} dBm)`;
  if (signal >= -65) return `Moderate (${signal} dBm)`;
  return `Weak (${signal} dBm)`;
};

const getSignalTone = (signal) => {
  if (signal == null) return 'bg-slate-500/50';
  if (signal >= -50) return 'bg-emerald-400/90 shadow-emerald-500/40';
  if (signal >= -65) return 'bg-amber-400/90 shadow-amber-500/40';
  return 'bg-rose-400/90 shadow-rose-500/40';
};

const getBandBadge = (channel) => {
  if (channel == null) {
    return {
      label: 'Unknown band',
      className:
        'border-slate-400/55 bg-slate-500/10 text-slate-100 motion-safe:transition-colors',
    };
  }
  if (channel <= 14) {
    return {
      label: '2.4 GHz',
      className:
        'border-sky-400/55 bg-sky-500/15 text-sky-100 motion-safe:transition-colors',
    };
  }
  if (channel <= 64) {
    return {
      label: '5 GHz (UNII-1)',
      className:
        'border-emerald-400/55 bg-emerald-500/15 text-emerald-100 motion-safe:transition-colors',
    };
  }
  return {
    label: '5 GHz+ lab',
    className:
      'border-fuchsia-400/55 bg-fuchsia-500/15 text-fuchsia-100 motion-safe:transition-colors',
  };
};

const MapVisualization = ({ points }) => {
  if (!points?.length) {
    return (
      <section
        aria-label="Wireless footprint map"
        className="space-y-3 rounded-xl border border-kali-border/60 bg-[color:var(--kali-surface)] p-4 text-[0.75rem] text-kali-muted shadow-kali-panel"
      >
        <h3 className="text-sm font-semibold uppercase tracking-wide text-kali-accent">
          Floor plan playback
        </h3>
        <p>No fixture locations were bundled with this build.</p>
      </section>
    );
  }

  return (
    <section
      aria-label="Wireless footprint map"
      className="space-y-3 rounded-xl border border-kali-border/60 bg-[color:var(--kali-surface)] p-4 shadow-kali-panel"
    >
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-kali-accent">
        Floor plan playback
      </h3>
      <p className="text-[0.65rem] uppercase tracking-wide text-kali-muted">
        Offline fixture — no live RF scanning
      </p>
    </div>
    <div className="relative h-64 w-full overflow-hidden rounded-lg border border-kali-border/40 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.15),transparent_45%),radial-gradient(circle_at_80%_30%,rgba(248,113,113,0.12),transparent_50%),radial-gradient(circle_at_40%_80%,rgba(125,211,252,0.08),transparent_55%)]"
      />
      {points.map((point) => (
        <button
          key={point.bssid}
          type="button"
          tabIndex={0}
          className="group absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus"
          style={{ left: `${point.x}%`, top: `${point.y}%` }}
          aria-label={`${point.ssid || 'Hidden SSID'} located ${describeSignal(point.signal)}`}
        >
          <span
            className={`flex h-9 w-9 items-center justify-center rounded-full border border-white/70 text-[0.65rem] font-semibold text-slate-950 shadow-xl shadow-black/40 ${getSignalTone(point.signal)} motion-safe:transition motion-safe:duration-500 motion-safe:ease-out`}
          >
            {point.ssid ? point.ssid.slice(0, 1) : '?'}
          </span>
          <span className="pointer-events-none mt-2 hidden rounded-md border border-slate-700/60 bg-slate-900/90 px-2 py-1 text-[0.65rem] text-slate-100 shadow-lg group-focus:block group-hover:block">
            <span className="block font-semibold text-slate-50">{point.ssid || 'Hidden network'}</span>
            <span className="block text-slate-300">{point.floor}</span>
            <span className="block text-slate-400">{describeSignal(point.signal)}</span>
          </span>
        </button>
      ))}
    </div>
    <ul className="grid gap-2 text-[0.7rem] text-kali-muted sm:grid-cols-2">
      {points.map((point) => (
        <li key={`${point.bssid}-legend`} className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${getDeviceBadgeClass(point.type)}`}
          >
            {getDeviceBadgeLabel(point.type)}
          </span>
          <span className="text-[color:color-mix(in_srgb,var(--kali-text)_80%,transparent)]">
            {point.ssid || 'Hidden'} • {point.floor}
          </span>
        </li>
      ))}
    </ul>
    </section>
  );
};

const KismetApp = ({ onNetworkDiscovered }) => {
  const [networks, setNetworks] = useState([]);
  const [networkSource, setNetworkSource] = useState('fixtures');
  const [channels, setChannels] = useState({});
  const [times, setTimes] = useState({});
  const [clients, setClients] = useState([]);
  const [channelFilter, setChannelFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [deviceTypeFilter, setDeviceTypeFilter] = useState('all');
  const [clientSortKey, setClientSortKey] = useState('signal');
  const [clientSortDirection, setClientSortDirection] = useState('desc');
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
      setVendorFilter('all');
      setDeviceTypeFilter('all');
      setError('');
    } catch (err) {
      setError('Unable to parse capture file.');
    }
  };

  const resetToFixtures = () => {
    const dataset = aggregateFixtures(fixturesCapture, onNetworkDiscovered);
    applyDataset(dataset, 'fixtures');
    setChannelFilter('all');
    setVendorFilter('all');
    setDeviceTypeFilter('all');
    setError('');
  };

  const filteredNetworks = useMemo(() => {
    if (channelFilter === 'all') return networks;
    const ch = Number(channelFilter);
    return networks.filter((net) => net.channel === ch);
  }, [networks, channelFilter]);

  const filteredClients = useMemo(() => {
    const filtered = clients.filter((client) => {
      const vendorOk = vendorFilter === 'all' || client.vendor === vendorFilter;
      const typeOk =
        deviceTypeFilter === 'all' || client.type === deviceTypeFilter;
      const channelOk =
        channelFilter === 'all' ||
        client.history.some((entry) => entry.channel === Number(channelFilter));
      return vendorOk && typeOk && channelOk;
    });

    const direction = clientSortDirection === 'asc' ? 1 : -1;
    const toValue = (client) => {
      if (clientSortKey === 'signal') {
        return client.strongestSignal ?? -1000;
      }
      if (clientSortKey === 'activity') {
        return client.history.length;
      }
      if (clientSortKey === 'type') {
        return client.type?.toLowerCase() ?? '';
      }
      return client.vendor?.toLowerCase() ?? '';
    };

    const sorted = [...filtered].sort((a, b) => {
      const aValue = toValue(a);
      const bValue = toValue(b);
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return (aValue - bValue) * direction;
      }
      return aValue.localeCompare(bValue) * direction;
    });

    return sorted;
  }, [
    clients,
    vendorFilter,
    deviceTypeFilter,
    channelFilter,
    clientSortKey,
    clientSortDirection,
  ]);

  const vendorOptions = useMemo(() => {
    const set = new Set(clients.map((client) => client.vendor));
    return Array.from(set).sort();
  }, [clients]);

  const deviceTypeOptions = useMemo(() => {
    const set = new Set(clients.map((client) => client.type));
    return Array.from(set).sort();
  }, [clients]);

  const fixtureSummary = useMemo(
    () => summarizeFixtures(networks, channels),
    [networks, channels],
  );

  const mapPoints = useMemo(() => {
    if (!networks.length) return fixtureLocations;
    const lookup = buildNetworkLookup(networks);
    return fixtureLocations.map((point) => {
      const network = lookup.get(point.bssid);
      return {
        ...point,
        vendor: network?.vendor ?? getVendor(point.bssid),
        signal: network?.avgSignal ?? point.signal ?? null,
      };
    });
  }, [networks]);

  const cycleSort = (key) => {
    if (clientSortKey !== key) {
      setClientSortKey(key);
      setClientSortDirection(key === 'signal' ? 'desc' : 'asc');
      return;
    }
    setClientSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  return (
    <div className="space-y-6 p-4 text-[color:var(--kali-text)] lg:space-y-8">
      <div
        className="rounded-xl border border-kali-border/70 bg-[color:var(--kali-surface)] p-4 text-sm shadow-kali-panel motion-safe:transition-all motion-safe:duration-500"
        data-state={labMode ? 'on' : 'off'}
        role="status"
        aria-live="polite"
      >
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p
              className={`text-base font-semibold uppercase tracking-wide ${
                labMode
                  ? 'text-kali-accent motion-safe:animate-[pulse_4s_ease-in-out_infinite]'
                  : 'text-kali-accent'
              }`}
            >
              Lab Mode {labMode ? 'enabled' : 'off'}
            </p>
            <p className="text-xs text-kali-muted">
              {labMode
                ? 'All datasets stay local. Upload captures for guided review.'
                : 'Enable Lab Mode to explore the full simulator. Offline summary remains available.'}
            </p>
            <p className="text-[0.7rem] text-[color:color-mix(in_srgb,var(--kali-text)_72%,transparent)]">
              Radio controls remain sandboxed. This dashboard replays canned telemetry—no live RF scanning or device changes
              occur.
            </p>
            {labMode && (
              <p
                className="flex items-center gap-2 text-[0.7rem] text-amber-200 motion-safe:animate-[pulse_2.6s_ease-in-out_infinite]"
                role="alert"
              >
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-400 shadow shadow-amber-500/40" aria-hidden="true" />
                Lab Mode unlocks sorting, filters, and uploads for offline lab analysis only.
              </p>
            )}
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
        <div className="rounded-xl border border-kali-border/70 bg-[color:var(--kali-surface)] p-4 text-xs shadow-kali-panel motion-safe:transition-opacity motion-safe:duration-500">
          <p className="text-sm font-semibold uppercase tracking-wide text-kali-accent">
            Offline summary
          </p>
          <p className="mt-1 text-[0.7rem] text-kali-muted">
            Review a frozen capture before switching to Lab Mode. Metrics update as fixtures replay—no antennas or hardware are
            touched.
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
              <>
                <label className="text-xs" htmlFor="vendor-filter">
                  <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide">
                    Device vendor
                  </span>
                  <select
                    id="vendor-filter"
                    aria-label="Device vendor filter"
                    className="w-44 rounded-lg border border-kali-border/60 bg-kali-dark p-1.5 text-xs text-[color:var(--kali-text)] shadow-sm focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                    value={vendorFilter}
                    onChange={(e) => setVendorFilter(e.target.value)}
                  >
                    <option value="all">All vendors</option>
                    {vendorOptions.map((vendor) => (
                      <option key={vendor} value={vendor}>
                        {vendor}
                      </option>
                    ))}
                  </select>
                </label>

                {deviceTypeOptions.length > 1 && (
                  <label className="text-xs" htmlFor="device-type-filter">
                    <span className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide">
                      Device type
                    </span>
                    <select
                      id="device-type-filter"
                      aria-label="Device type filter"
                      className="w-40 rounded-lg border border-kali-border/60 bg-kali-dark p-1.5 text-xs text-[color:var(--kali-text)] shadow-sm focus:border-kali-accent focus:outline-none focus:ring-1 focus:ring-kali-accent/40"
                      value={deviceTypeFilter}
                      onChange={(e) => setDeviceTypeFilter(e.target.value)}
                    >
                      <option value="all">All device types</option>
                      {deviceTypeOptions.map((type) => (
                        <option key={type} value={type}>
                          {getDeviceBadgeLabel(type)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <fieldset className="text-xs">
                  <legend className="mb-1 block text-[0.7rem] font-semibold uppercase tracking-wide">
                    Sort devices
                  </legend>
                  <div className="flex flex-wrap gap-1">
                    {[
                      { key: 'signal', label: 'Signal' },
                      { key: 'activity', label: 'Activity' },
                      { key: 'type', label: 'Type' },
                      { key: 'vendor', label: 'Vendor' },
                    ].map(({ key, label }) => {
                      const active = clientSortKey === key;
                      const direction = active ? clientSortDirection : 'asc';
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => cycleSort(key)}
                          aria-pressed={active}
                          className={`rounded-lg border px-2 py-1 text-[0.65rem] font-semibold uppercase tracking-wide transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-kali-focus ${
                            active
                              ? 'border-kali-accent bg-kali-accent/20 text-kali-accent shadow-sm'
                              : 'border-kali-border/60 text-[color:color-mix(in_srgb,var(--kali-text)_82%,transparent)] hover:border-kali-accent/60'
                          } motion-safe:transition-colors motion-safe:duration-200`}
                        >
                          {label}
                          {active && (
                            <span className="ml-1 align-middle text-[0.6rem]">
                              {direction === 'asc' ? '↑' : '↓'}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              </>
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

            <div
              className="text-[10px] uppercase tracking-wide text-kali-muted motion-safe:animate-pulse motion-safe:duration-[3500ms]"
              aria-live="polite"
            >
              Dataset source: {networkSource === 'fixtures' ? 'Demo fixtures' : 'Upload replay'}
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
                          <th scope="col" className="px-4 py-3">
                            SSID
                          </th>
                          <th scope="col" className="px-4 py-3">
                            BSSID
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Channel
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Band
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Vendor
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Frames
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-[color:color-mix(in_srgb,var(--kali-text)_92%,transparent)]">
                        {filteredNetworks.map((n) => {
                          const band = getBandBadge(n.channel);
                          return (
                            <tr key={n.bssid} className="odd:bg-[color:var(--color-surface-muted)]">
                              <td className="px-4 py-2">{n.ssid || '(hidden)'}</td>
                              <td className="px-4 py-2 font-mono text-xs">{n.bssid}</td>
                              <td className="px-4 py-2">{n.channel ?? '-'}</td>
                              <td className="px-4 py-2">
                                <span
                                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${band.className}`}
                                >
                                  {band.label}
                                </span>
                              </td>
                              <td className="px-4 py-2">{n.vendor}</td>
                              <td className="px-4 py-2">{n.frames}</td>
                            </tr>
                          );
                        })}
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
                          <th scope="col" className="px-4 py-3">
                            MAC
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Type
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Vendor
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Signal
                          </th>
                          <th scope="col" className="px-4 py-3">
                            Known networks
                          </th>
                        </tr>
                      </thead>
                      <tbody className="text-[color:color-mix(in_srgb,var(--kali-text)_92%,transparent)]">
                        {filteredClients.map((client) => (
                          <tr key={client.mac} className="odd:bg-[color:var(--color-surface-muted)]">
                            <td className="px-4 py-2 font-mono text-[0.7rem]">{client.mac}</td>
                            <td className="px-4 py-2">
                              <span
                                className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-wide ${getDeviceBadgeClass(client.type)}`}
                              >
                                {getDeviceBadgeLabel(client.type)}
                              </span>
                            </td>
                            <td className="px-4 py-2">{client.vendor}</td>
                            <td className="px-4 py-2">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-slate-950 shadow ${getSignalTone(client.strongestSignal)}`}
                              >
                                <span>{client.strongestSignal != null ? `${client.strongestSignal} dBm` : 'n/a'}</span>
                              </span>
                              <span className="ml-2 text-[0.65rem] text-kali-muted">
                                {describeSignal(client.strongestSignal)}
                              </span>
                            </td>
                            <td className="px-4 py-2">
                              <ul className="list-disc space-y-1 pl-4 text-[0.75rem]">
                                {client.history.map((entry, idx) => (
                                  <li key={`${client.mac}-${idx}`}>
                                    {entry.ssid || '(hidden)'} – {entry.bssid}
                                    {entry.channel != null && (
                                      <span className="text-kali-muted"> (ch {entry.channel})</span>
                                    )}
                                    {typeof entry.signal === 'number' && (
                                      <span className="text-kali-muted"> · {entry.signal} dBm</span>
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
              <MapVisualization points={mapPoints} />
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

