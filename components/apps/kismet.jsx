import React, { useEffect, useMemo, useRef, useState } from 'react';
import vendors from './kismet/oui.json';

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
      networks[key] = { ...info, frames: 0, signal: null };
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

const EMPTY_CAPTURE = Object.freeze([]);

const getVendorName = (mac) => {
  if (!mac) return 'Unknown vendor';
  const prefix = mac.slice(0, 8).toUpperCase();
  return vendors[prefix] || 'Unknown vendor';
};

const formatRssi = (signal) => {
  if (typeof signal === 'number' && !Number.isNaN(signal)) {
    return `${signal} dBm`;
  }
  return 'N/A';
};

const fallbackCopyText = (text) => {
  if (typeof document === 'undefined') return false;
  try {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.setAttribute('readonly', '');
    textarea.style.position = 'absolute';
    textarea.style.left = '-9999px';
    document.body.appendChild(textarea);
    textarea.select();
    let success = false;
    if (typeof document.execCommand === 'function') {
      success = document.execCommand('copy');
    }
    document.body.removeChild(textarea);
    return success;
  } catch (err) {
    console.warn('Fallback copy failed', err);
    return false;
  }
};

const aggregateCaptureRecords = (records = []) => {
  if (!records.length) {
    return { networks: [], channelCounts: {}, timeCounts: {} };
  }

  const networkMap = new Map();
  const channelCounts = {};

  records.forEach((record, index) => {
    const {
      ssid = '',
      bssid = '',
      channel,
      signal,
    } = record || {};
    const key = bssid || `${ssid || 'network'}-${index}`;
    if (!networkMap.has(key)) {
      networkMap.set(key, {
        ssid,
        bssid,
        channel,
        frames: 0,
        signalSamples: [],
      });
    }
    const entry = networkMap.get(key);
    entry.frames += 1;
    if (typeof signal === 'number' && !Number.isNaN(signal)) {
      entry.signalSamples.push(signal);
    }
    if (channel != null) {
      channelCounts[channel] = (channelCounts[channel] || 0) + 1;
    }
  });

  const networks = Array.from(networkMap.values()).map((entry) => ({
    ssid: entry.ssid,
    bssid: entry.bssid,
    channel: entry.channel,
    frames: entry.frames,
    signal:
      entry.signalSamples.length > 0
        ? Math.round(
            entry.signalSamples.reduce((sum, value) => sum + value, 0) /
              entry.signalSamples.length,
          )
        : null,
  }));

  return {
    networks,
    channelCounts,
    timeCounts: {},
  };
};

const buildTooltipId = (value, index) => {
  const safeValue = (value || `network-${index}`)
    .toString()
    .replace(/[^a-zA-Z0-9_-]/g, '-');
  return `network-tooltip-${safeValue}`;
};

const COPY_LABELS = {
  mac: 'MAC address',
  vendor: 'Vendor',
  rssi: 'RSSI',
};

const CopyButton = ({ label, state, onCopy }) => (
  <button
    type="button"
    onClick={onCopy}
    aria-label={`Copy ${label}`}
    className="relative inline-flex h-7 w-20 items-center justify-center overflow-hidden rounded border border-cyan-500/40 bg-black/30 text-[11px] uppercase tracking-wide text-cyan-200 transition hover:bg-cyan-500/20 focus:outline-none focus:ring-1 focus:ring-cyan-400"
  >
    <span
      className={`transition-opacity duration-150 ${
        state === 'idle' ? 'opacity-100' : 'opacity-0'
      }`}
    >
      Copy
    </span>
    <span
      aria-hidden="true"
      className={`absolute inset-0 flex items-center justify-center text-[10px] font-semibold transition-opacity duration-150 ${
        state === 'copied'
          ? 'opacity-100 text-emerald-400'
          : state === 'error'
          ? 'opacity-100 text-red-400'
          : 'opacity-0'
      }`}
    >
      {state === 'error' ? 'Error' : 'Copied'}
    </span>
  </button>
);

const NetworkTooltip = ({
  id,
  mac,
  vendor,
  rssi,
  onMouseEnter,
  onMouseLeave,
}) => {
  const [copyState, setCopyState] = useState({
    mac: 'idle',
    vendor: 'idle',
    rssi: 'idle',
  });
  const [liveMessage, setLiveMessage] = useState('');
  const timersRef = useRef({});

  useEffect(() => () => {
    Object.values(timersRef.current).forEach((timer) => {
      if (timer) {
        window.clearTimeout(timer);
      }
    });
  }, []);

  const scheduleReset = (key) => {
    if (timersRef.current[key]) {
      window.clearTimeout(timersRef.current[key]);
    }
    timersRef.current[key] = window.setTimeout(() => {
      setCopyState((prev) => ({ ...prev, [key]: 'idle' }));
      setLiveMessage('');
      delete timersRef.current[key];
    }, 1600);
  };

  const updateState = (key, nextState) => {
    setCopyState((prev) => ({ ...prev, [key]: nextState }));
    if (nextState === 'copied') {
      setLiveMessage(`${COPY_LABELS[key]} copied to clipboard`);
    } else if (nextState === 'error') {
      setLiveMessage(`Unable to copy ${COPY_LABELS[key]}`);
    }
    if (nextState !== 'idle') {
      scheduleReset(key);
    }
  };

  const copyValue = (key, value) => {
    const text = value ?? 'N/A';
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => updateState(key, 'copied'))
        .catch(() => updateState(key, 'error'));
      return;
    }

    window.setTimeout(() => {
      const success = fallbackCopyText(text);
      updateState(key, success ? 'copied' : 'error');
    }, 0);
  };

  const rows = useMemo(
    () => [
      {
        key: 'mac',
        label: 'MAC',
        display: mac || 'Unknown',
        value: mac || 'Unknown',
      },
      {
        key: 'vendor',
        label: 'Vendor',
        display: vendor || 'Unknown vendor',
        value: vendor || 'Unknown vendor',
      },
      {
        key: 'rssi',
        label: 'RSSI',
        display: rssi || 'N/A',
        value: rssi || 'N/A',
      },
    ],
    [mac, vendor, rssi],
  );

  return (
    <div
      id={id}
      role="tooltip"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      className="pointer-events-auto absolute left-0 top-full z-30 mt-2 w-64 min-h-[9rem] rounded-md border border-cyan-400/40 bg-gray-900/95 p-3 text-xs text-white shadow-2xl"
    >
      <p className="text-sm font-semibold text-cyan-300">Network details</p>
      <dl className="mt-2 space-y-2 text-[11px]">
        {rows.map(({ key, label, display, value }) => (
          <div key={key} className="flex items-center gap-3">
            <div className="flex-1">
              <dt className="text-[10px] uppercase tracking-wide text-cyan-200/70">
                {label}
              </dt>
              <dd className="truncate text-white" title={display}>
                {display}
              </dd>
            </div>
            <CopyButton
              label={COPY_LABELS[key]}
              state={copyState[key]}
              onCopy={() => copyValue(key, value)}
            />
          </div>
        ))}
      </dl>
      <div className="sr-only" aria-live="polite">
        {liveMessage}
      </div>
    </div>
  );
};

const NetworkRow = ({ network, index }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);
  const tooltipId = useMemo(
    () => buildTooltipId(network.bssid || network.ssid, index),
    [network.bssid, network.ssid, index],
  );
  const vendor = useMemo(() => getVendorName(network.bssid), [network.bssid]);
  const rssiDisplay = useMemo(() => formatRssi(network.signal), [network.signal]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open]);

  const handleBlur = () => {
    window.setTimeout(() => {
      if (!wrapperRef.current) return;
      const active = document.activeElement;
      if (active && wrapperRef.current.contains(active)) {
        return;
      }
      setOpen(false);
    }, 0);
  };

  return (
    <tr className="odd:bg-gray-800">
      <td className="pr-2">{network.ssid || '(hidden)'}</td>
      <td className="pr-2">{network.bssid || '-'}</td>
      <td className="pr-2">{network.channel ?? '-'}</td>
      <td className="pr-2">{network.frames}</td>
      <td className="relative">
        <div
          ref={wrapperRef}
          className="relative inline-flex items-center"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          onBlur={handleBlur}
        >
          <button
            type="button"
            onClick={() => setOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={open}
            aria-controls={tooltipId}
            aria-label={`Show network details for ${
              network.ssid || network.bssid || 'unknown network'
            }`}
            className="rounded border border-cyan-500/40 px-2 py-1 text-[11px] uppercase tracking-wide text-cyan-300 transition hover:bg-cyan-500/10 focus:outline-none focus:ring-2 focus:ring-cyan-400"
          >
            Details
          </button>
          {open ? (
            <NetworkTooltip
              id={tooltipId}
              mac={network.bssid}
              vendor={vendor}
              rssi={rssiDisplay}
              onMouseEnter={() => setOpen(true)}
              onMouseLeave={() => setOpen(false)}
            />
          ) : null}
        </div>
      </td>
    </tr>
  );
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

const KismetApp = ({ onNetworkDiscovered, initialCapture }) => {
  const capture = initialCapture ?? EMPTY_CAPTURE;
  const [networks, setNetworks] = useState([]);
  const [channels, setChannels] = useState({});
  const [times, setTimes] = useState({});

  useEffect(() => {
    if (!capture.length) return;
    const aggregated = aggregateCaptureRecords(capture);
    setNetworks(aggregated.networks);
    setChannels(aggregated.channelCounts);
    setTimes(aggregated.timeCounts);
  }, [capture]);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const buffer = await file.arrayBuffer();
    const { networks, channelCounts, timeCounts } = parsePcap(
      buffer,
      onNetworkDiscovered,
    );
    setNetworks(
      networks.map((network) => ({
        ...network,
        signal:
          typeof network.signal === 'number' && !Number.isNaN(network.signal)
            ? Math.round(network.signal)
            : null,
      })),
    );
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
                <th className="pr-2">Frames</th>
                <th className="pr-2">Details</th>
              </tr>
            </thead>
            <tbody>
              {networks.map((network, index) => (
                <NetworkRow key={network.bssid || `${network.ssid}-${index}`} network={network} index={index} />
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
