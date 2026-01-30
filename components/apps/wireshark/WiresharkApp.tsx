'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { List, RowComponentProps } from 'react-window';
import SimulationBanner from '../SimulationBanner';
import Waterfall from './Waterfall';
import BurstChart from './BurstChart';
import DecodeTree from './DecodeTree';
import { protocolName, getRowColor, matchesDisplayFilter } from './utils';
import ColorRuleEditor from './ColorRuleEditor';
import FilterHelper from './FilterHelper';
import FlowGraph from './FlowGraph';
import { parsePcap, ParsedPacket } from '../../../utils/pcap';
import usePersistentState from '../../../hooks/usePersistentState';

const ROW_HEIGHT = 28;

const SAMPLE_SOURCES = [
  { label: 'HTTP sample (http.pcap)', path: '/samples/wireshark/http.pcap' },
  { label: 'DNS sample (dns.pcap)', path: '/samples/wireshark/dns.pcap' },
];

const speedOptions = [0.25, 0.5, 1, 2, 4];

type ViewMode = 'packets' | 'flows';

type PlaybackStatus = 'stopped' | 'playing' | 'paused';

interface WiresharkPacket extends ParsedPacket {
  id: string;
  timestampMs: number;
  timestampText: string;
}

interface WiresharkAppProps {
  initialPackets?: Partial<ParsedPacket>[];
}

const parseTimestampMs = (value: string | number | undefined) => {
  if (typeof value === 'number') {
    return value > 1e12 ? value : value * 1000;
  }
  const parsed = Number(value ?? 0);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 1e12 ? parsed : parsed * 1000;
};

const formatTimestamp = (timestampMs: number, baseMs: number) => {
  if (!Number.isFinite(timestampMs)) return '0.000000';
  const delta = Math.max(0, timestampMs - baseMs);
  return (delta / 1000).toFixed(6);
};

const bytesToHexLines = (bytes: Uint8Array) => {
  const lines: string[] = [];
  for (let i = 0; i < bytes.length; i += 16) {
    const chunk = bytes.slice(i, i + 16);
    const hex = Array.from(chunk)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join(' ');
    const offset = i.toString(16).padStart(4, '0');
    lines.push(`${offset}  ${hex}`);
  }
  return lines;
};

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = '';
  bytes.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
};

const copyText = async (value: string) => {
  if (!value) return;
  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return;
    } catch {
      // fall back below
    }
  }
  const textarea = document.createElement('textarea');
  textarea.value = value;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
};

const normalizePackets = (packets: Partial<ParsedPacket>[]) => {
  return packets.map((packet, index) => {
    const timestampMs =
      typeof packet.timestampMs === 'number'
        ? packet.timestampMs
        : parseTimestampMs(packet.timestamp);
    const data = packet.data ?? new Uint8Array();
    return {
      id: `${packet.timestamp ?? 'pkt'}-${index}`,
      timestamp: packet.timestamp ?? '0',
      timestampMs,
      timestampText: '',
      len: packet.len ?? data.length,
      src: packet.src ?? '',
      dest: packet.dest ?? '',
      protocol: packet.protocol ?? 0,
      info: packet.info ?? '',
      sport: packet.sport,
      dport: packet.dport,
      data,
      layers: packet.layers ?? {},
      plaintext: packet.plaintext,
      decrypted: packet.decrypted,
    } as WiresharkPacket;
  });
};

const matchesBpf = (packet: WiresharkPacket, expr: string) => {
  if (!expr) return true;
  const f = expr.trim().toLowerCase();
  if (f === 'tcp') return packet.protocol === 6;
  if (f === 'udp') return packet.protocol === 17;
  if (f === 'icmp') return packet.protocol === 1;
  const port = f.match(/^port (\d+)$/);
  if (port) {
    const num = parseInt(port[1], 10);
    return packet.sport === num || packet.dport === num;
  }
  const host = f.match(/^host (.+)$/);
  if (host) {
    const ip = host[1];
    return packet.src === ip || packet.dest === ip;
  }
  return true;
};

const WiresharkApp: React.FC<WiresharkAppProps> = ({ initialPackets = [] }) => {
  const initialNormalized = useMemo(
    () => normalizePackets(initialPackets),
    [initialPackets]
  );
  const [loadedPackets, setLoadedPackets] = useState<WiresharkPacket[]>(initialNormalized);
  const [emittedPackets, setEmittedPackets] = useState<WiresharkPacket[]>(initialNormalized);
  const [filter, setFilter] = useState('');
  const [bpf, setBpf] = usePersistentState<string>('wireshark:bpf', '');
  const [protocolFilter, setProtocolFilter] = usePersistentState<string>(
    'wireshark:protocol-filter',
    ''
  );
  const [view, setView] = usePersistentState<ViewMode>('wireshark:view', 'packets');
  const [colorRules, setColorRules] = usePersistentState(
    'wireshark:color-rules',
    [] as { expression: string; color: string }[]
  );
  const [playbackSpeed, setPlaybackSpeed] = usePersistentState<number>(
    'wireshark:playback-speed',
    1
  );
  const [loopPlayback, setLoopPlayback] = usePersistentState<boolean>(
    'wireshark:loop',
    false
  );
  const [playbackStatus, setPlaybackStatus] = useState<PlaybackStatus>('stopped');
  const [playbackIndex, setPlaybackIndex] = useState(initialNormalized.length);
  const [selectedPacketId, setSelectedPacketId] = useState<string | null>(
    initialNormalized[0]?.id ?? null
  );
  const [tlsKeys, setTlsKeys] = useState('');
  const [timeline, setTimeline] = useState<WiresharkPacket[]>([]);
  const [minuteData, setMinuteData] = useState<{ minute: number; count: number }[]>([]);
  const [announcement, setAnnouncement] = useState('');
  const [error, setError] = useState('');
  const [loadingSource, setLoadingSource] = useState(false);

  const workerRef = useRef<Worker | null>(null);
  const prefersReducedMotion = useRef(false);
  const lastEmittedIndexRef = useRef(-1);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem('wireshark-filter');
    if (saved) setFilter(saved);
    if (window.matchMedia) {
      prefersReducedMotion.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof Worker !== 'function') return;
    const worker = new Worker(new URL('./burstWorker.js', import.meta.url));
    worker.onmessage = (e) => {
      if (e.data.type === 'burst') {
        setAnnouncement(`Burst starting at ${e.data.start}`);
      }
      if (e.data.type === 'timeline') {
        setTimeline(e.data.timeline);
      }
      if (e.data.type === 'minutes') {
        setMinuteData(e.data.minutes);
      }
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    if (!workerRef.current || !initialNormalized.length) return;
    workerRef.current.postMessage({ type: 'reset' });
    initialNormalized.forEach((packet) =>
      workerRef.current?.postMessage({ type: 'packet', packet })
    );
  }, [initialNormalized]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('wireshark-filter', filter);
  }, [filter]);

  const baseTimestampMs = useMemo(() => {
    const first = emittedPackets[0]?.timestampMs;
    if (Number.isFinite(first)) return first;
    return loadedPackets[0]?.timestampMs ?? 0;
  }, [emittedPackets, loadedPackets]);

  const normalizedPackets = useMemo(() => {
    const base = loadedPackets[0]?.timestampMs ?? baseTimestampMs;
    return loadedPackets.map((packet) => ({
      ...packet,
      timestampText: formatTimestamp(packet.timestampMs, base),
    }));
  }, [loadedPackets, baseTimestampMs]);

  const displayedPackets = useMemo(() => {
    const base = baseTimestampMs;
    return emittedPackets.map((packet) => ({
      ...packet,
      timestampText: formatTimestamp(packet.timestampMs, base),
    }));
  }, [emittedPackets, baseTimestampMs]);

  const protocols = useMemo(() => {
    return Array.from(new Set(displayedPackets.map((p) => protocolName(p.protocol))));
  }, [displayedPackets]);

  const filteredPackets = useMemo(() => {
    return displayedPackets
      .filter((p) => matchesDisplayFilter(p, filter))
      .filter((p) => matchesBpf(p, bpf))
      .filter((p) => !protocolFilter || protocolName(p.protocol) === protocolFilter);
  }, [displayedPackets, filter, bpf, protocolFilter]);

  const [sortConfig, setSortConfig] = useState({ key: 'Time', direction: 'asc' });

  const sortedPackets = useMemo(() => {
    const sortable = [...filteredPackets];
    const dir = sortConfig.direction === 'asc' ? 1 : -1;
    sortable.sort((a, b) => {
      switch (sortConfig.key) {
        case 'Time':
          return dir * (a.timestampMs - b.timestampMs);
        case 'Source':
          return dir * a.src.localeCompare(b.src);
        case 'Destination':
          return dir * a.dest.localeCompare(b.dest);
        case 'Protocol':
          return dir * protocolName(a.protocol).localeCompare(protocolName(b.protocol));
        case 'Length':
          return dir * (a.len - b.len);
        default:
          return 0;
      }
    });
    return sortable;
  }, [filteredPackets, sortConfig]);

  const selectedPacket = useMemo(() => {
    if (!selectedPacketId) return null;
    return sortedPackets.find((packet) => packet.id === selectedPacketId) ?? null;
  }, [sortedPackets, selectedPacketId]);

  useEffect(() => {
    if (selectedPacketId && !selectedPacket) {
      setSelectedPacketId(sortedPackets[0]?.id ?? null);
    }
  }, [selectedPacketId, selectedPacket, sortedPackets]);

  const resetPlayback = useCallback(() => {
    setPlaybackStatus('stopped');
    setPlaybackIndex(0);
    setEmittedPackets([]);
    setSelectedPacketId(null);
    setTimeline([]);
    setMinuteData([]);
    lastEmittedIndexRef.current = -1;
    workerRef.current?.postMessage({ type: 'reset' });
  }, []);

  const emitPacket = useCallback((packet: WiresharkPacket) => {
    setEmittedPackets((prev) => [...prev, packet]);
    workerRef.current?.postMessage({ type: 'packet', packet });
    setSelectedPacketId((prev) => prev ?? packet.id);
  }, []);

  useEffect(() => {
    if (playbackStatus !== 'playing') return;
    if (playbackIndex >= normalizedPackets.length) {
      if (loopPlayback && normalizedPackets.length) {
        resetPlayback();
        setPlaybackStatus('playing');
      } else {
        setPlaybackStatus('stopped');
      }
      return;
    }
    if (lastEmittedIndexRef.current !== playbackIndex) {
      const packet = normalizedPackets[playbackIndex];
      emitPacket(packet);
      lastEmittedIndexRef.current = playbackIndex;
    }
    const current = normalizedPackets[playbackIndex];
    const next = normalizedPackets[playbackIndex + 1];
    const deltaMs = next ? Math.max(0, next.timestampMs - current.timestampMs) : 0;
    const delay = Math.max(40, Math.min(2000, deltaMs / playbackSpeed || 200));
    const timer = window.setTimeout(() => {
      setPlaybackIndex((idx) => idx + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [
    playbackStatus,
    playbackIndex,
    normalizedPackets,
    playbackSpeed,
    loopPlayback,
    emitPacket,
    resetPlayback,
  ]);

  const handleStart = () => {
    resetPlayback();
    setPlaybackStatus('playing');
    setAnnouncement('Simulation playback started');
  };

  const handlePauseToggle = () => {
    setPlaybackStatus((status) => {
      const next = status === 'playing' ? 'paused' : 'playing';
      setAnnouncement(next === 'paused' ? 'Playback paused' : 'Playback resumed');
      return next;
    });
  };

  const handleStop = () => {
    resetPlayback();
    setAnnouncement('Playback stopped');
  };

  const handleStep = () => {
    if (!normalizedPackets.length) return;
    const nextIndex = playbackIndex >= normalizedPackets.length ? 0 : playbackIndex;
    const packet = normalizedPackets[nextIndex];
    emitPacket(packet);
    lastEmittedIndexRef.current = nextIndex;
    setPlaybackIndex(nextIndex + 1);
    setPlaybackStatus('paused');
  };

  const handleSample = async (path: string) => {
    setLoadingSource(true);
    try {
      const res = await fetch(path);
      const buf = await res.arrayBuffer();
      const parsed = parsePcap(buf) as ParsedPacket[];
      const normalized = normalizePackets(parsed);
      setLoadedPackets(normalized);
      setEmittedPackets(normalized);
      setPlaybackIndex(normalized.length);
      setSelectedPacketId(normalized[0]?.id ?? null);
      setPlaybackStatus('stopped');
      setError('');
      setAnnouncement(`Loaded ${normalized.length} packets from ${path}`);
      workerRef.current?.postMessage({ type: 'reset' });
      normalized.forEach((packet) =>
        workerRef.current?.postMessage({ type: 'packet', packet })
      );
    } catch (err) {
      setError((err as Error).message || 'Failed to parse capture');
    } finally {
      setLoadingSource(false);
    }
  };

  const handleFile = async (file: File) => {
    setLoadingSource(true);
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parsePcap(buffer) as ParsedPacket[];
      const normalized = normalizePackets(parsed);
      setLoadedPackets(normalized);
      setEmittedPackets(normalized);
      setPlaybackIndex(normalized.length);
      setSelectedPacketId(normalized[0]?.id ?? null);
      setPlaybackStatus('stopped');
      setError('');
      setAnnouncement(`Loaded ${normalized.length} packets from ${file.name}`);
      workerRef.current?.postMessage({ type: 'reset' });
      normalized.forEach((packet) =>
        workerRef.current?.postMessage({ type: 'packet', packet })
      );
    } catch (err) {
      setError((err as Error).message || 'Unsupported file');
    } finally {
      setLoadingSource(false);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files?.[0];
    if (!file) return;
    if (file.name.endsWith('.pcap') || file.name.endsWith('.pcapng')) {
      handleFile(file);
    } else {
      setError('Unsupported file format');
    }
  };

  const handleTLSKeyUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setTlsKeys(String(reader.result ?? ''));
    reader.readAsText(file);
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev.key !== key) return { key, direction: 'asc' };
      return { key, direction: prev.direction === 'asc' ? 'desc' : 'asc' };
    });
  };

  const handleExportPackets = async () => {
    const payload = filteredPackets.map((packet) => ({
      timestamp: packet.timestampText || packet.timestamp,
      src: packet.src,
      dest: packet.dest,
      protocol: protocolName(packet.protocol),
      len: packet.len,
      info: packet.info,
    }));
    await copyText(JSON.stringify(payload, null, 2));
    setAnnouncement(`Exported ${payload.length} packets to clipboard`);
  };

  const handleRowKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!sortedPackets.length) return;
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    const currentIndex = sortedPackets.findIndex((pkt) => pkt.id === selectedPacketId);
    const delta = event.key === 'ArrowDown' ? 1 : -1;
    const nextIndex = Math.min(
      sortedPackets.length - 1,
      Math.max(0, currentIndex + delta)
    );
    setSelectedPacketId(sortedPackets[nextIndex].id);
  };

  const renderRow = ({
    index,
    style,
    items,
    selectedId,
    onSelect,
    hasPlaintext,
  }: RowComponentProps<{
    items: WiresharkPacket[];
    selectedId: string | null;
    onSelect: (id: string) => void;
    hasPlaintext: boolean;
  }>) => {
    const packet = items[index];
    const isSelected = packet.id === selectedId;
    const isMatch = matchesDisplayFilter(packet, filter);
    const rowColor = getRowColor(packet, colorRules);
    return (
      <div
        role="row"
        data-row={packet.id}
        tabIndex={-1}
        onClick={() => onSelect(packet.id)}
        style={style}
        className={`grid grid-cols-[8rem_8rem_8rem_6rem_5rem_1fr${hasPlaintext ? '_10rem' : ''}] px-2 text-xs items-center border-b border-gray-800 ${
          index % 2 ? 'bg-gray-900' : 'bg-gray-800'
        } ${rowColor} ${isMatch ? 'bg-yellow-900' : ''} ${
          isSelected ? 'outline outline-1 outline-yellow-400' : ''
        }`}
      >
        <span className="truncate">{packet.timestampText || packet.timestamp}</span>
        <span className="truncate">{packet.src}</span>
        <span className="truncate">{packet.dest}</span>
        <span className="truncate">{protocolName(packet.protocol)}</span>
        <span className="truncate">{packet.len}</span>
        <span className="truncate">{packet.info}</span>
        {hasPlaintext && (
          <span className="truncate">{packet.plaintext || packet.decrypted || ''}</span>
        )}
      </div>
    );
  };

  const filteredPacketCount = filteredPackets.length;
  const hasTlsKeys = Boolean(tlsKeys);
  const emptyState = !loadingSource && !loadedPackets.length;
  const filteredEmpty = !emptyState && !filteredPacketCount;

  return (
    <div
      className="w-full h-full flex flex-col bg-[color:var(--kali-terminal)] text-green-400"
      onDrop={handleDrop}
      onDragOver={(event) => event.preventDefault()}
    >
      <SimulationBanner
        toolName="Wireshark"
        message="Simulation playback only. Offline datasets are bundled; no live capture or network traffic."
        className="mx-3 mt-3"
      />
      <div className="px-3 pb-3 text-xs text-[color:var(--color-muted)]">
        Playback engines replay static packet fixtures for analysis practice. Use Start, Pause, and Step to
        explore streams at your own pace.
      </div>
      {error && <div className="mx-3 mb-2 text-xs text-red-300">{error}</div>}
      <div className="mx-3 mb-3 grid gap-3 rounded-md border border-gray-800 bg-gray-900/70 p-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1 min-w-[220px]">
            <span className="text-xs uppercase tracking-wide text-gray-400">Capture source</span>
            <select
              onChange={(event) => {
                if (event.target.value) handleSample(event.target.value);
                event.target.value = '';
              }}
              className="px-2 py-1 rounded bg-gray-800 text-white text-sm"
              aria-label="Select sample capture"
              disabled={loadingSource}
            >
              <option value="">Open bundled sample…</option>
              {SAMPLE_SOURCES.map(({ label, path }) => (
                <option key={path} value={path}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Upload pcap/pcapng
            <input
              type="file"
              accept=".pcap,.pcapng"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) handleFile(file);
              }}
              className="text-xs text-white"
              aria-label="Upload capture file"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              setLoadedPackets([]);
              resetPlayback();
              setError('');
            }}
            className="px-2 py-1 bg-gray-700 rounded text-xs"
          >
            Clear
          </button>
          <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
            <span>{loadingSource ? 'Loading…' : `${loadedPackets.length} packets loaded`}</span>
          </div>
        </div>
        <div
          className="rounded border border-dashed border-gray-700 px-3 py-2 text-xs text-gray-400"
          aria-label="Drop pcap file"
        >
          Drag & drop a capture file here (pcap/pcapng). Offline-safe only.
        </div>
      </div>
      <div className="mx-3 mb-3 grid gap-3 rounded-md border border-gray-800 bg-gray-900/70 p-3">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex flex-col gap-1">
            <span className="text-xs uppercase tracking-wide text-gray-400">Playback controls</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={!loadedPackets.length}
                className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
              >
                Start
              </button>
              <button
                type="button"
                onClick={handlePauseToggle}
                disabled={!loadedPackets.length || playbackStatus === 'stopped'}
                className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
                aria-pressed={playbackStatus === 'paused'}
              >
                {playbackStatus === 'paused' ? 'Resume' : 'Pause'}
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="px-3 py-1 bg-gray-700 rounded"
              >
                Stop
              </button>
              <button
                type="button"
                onClick={handleStep}
                disabled={!loadedPackets.length}
                className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
              >
                Step
              </button>
            </div>
          </div>
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            Speed
            <select
              value={playbackSpeed}
              onChange={(event) => setPlaybackSpeed(Number(event.target.value))}
              className="px-2 py-1 rounded bg-gray-800 text-white"
            >
              {speedOptions.map((speed) => (
                <option key={speed} value={speed}>
                  {speed}x
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={loopPlayback}
              onChange={(event) => setLoopPlayback(event.target.checked)}
              aria-label="Loop playback"
            />
            Loop playback
          </label>
          <span className="ml-auto text-xs text-gray-400">
            Status: {playbackStatus} • {emittedPackets.length}/{loadedPackets.length} shown
          </span>
        </div>
      </div>
      <div className="mx-3 mb-3 grid gap-3 rounded-md border border-gray-800 bg-gray-900/70 p-3">
        <div className="flex flex-wrap gap-3 items-center">
          <span className="text-xs uppercase tracking-wide text-gray-400">Filters</span>
          <FilterHelper value={filter} onChange={setFilter} />
          <input
            value={bpf}
            onChange={(event) => setBpf(event.target.value)}
            list="bpf-suggestions"
            placeholder="BPF filter (e.g. tcp, port 80)"
            aria-label="BPF filter"
            className="px-2 py-1 bg-gray-800 rounded text-white"
          />
          <datalist id="bpf-suggestions">
            <option value="tcp">tcp</option>
            <option value="udp">udp</option>
            <option value="icmp">icmp</option>
            <option value="port 80">port 80</option>
            <option value="host 10.0.0.1">host 10.0.0.1</option>
          </datalist>
          <a
            href="https://www.wireshark.org/docs/dfref/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline whitespace-nowrap"
          >
            Display filter docs
          </a>
          <label className="flex items-center gap-2 text-xs text-gray-400">
            TLS key file
            <input
              type="file"
              accept=".keys,.txt,.log"
              onChange={handleTLSKeyUpload}
              aria-label="TLS key file"
              className="text-xs text-white"
            />
          </label>
        </div>
        <div className="flex flex-wrap gap-3 items-start">
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-xs uppercase tracking-wide text-gray-400">Protocols</span>
            <button
              className={`px-2 py-1 rounded border text-xs ${
                protocolFilter === '' ? 'bg-gray-700' : 'bg-gray-800'
              }`}
              onClick={() => setProtocolFilter('')}
              aria-pressed={protocolFilter === ''}
            >
              All
            </button>
            {protocols.map((proto) => (
              <button
                key={proto}
                className={`px-2 py-1 rounded border text-xs ${
                  protocolFilter === proto ? 'bg-gray-700' : 'bg-gray-800'
                }`}
                onClick={() => setProtocolFilter(String(proto))}
                aria-pressed={protocolFilter === proto}
              >
                {proto}
              </button>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-400">Color rules</span>
            <ColorRuleEditor rules={colorRules} onChange={setColorRules} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-400">Views</span>
            <div className="flex gap-2">
              <button
                className={`px-2 py-1 rounded border text-xs ${
                  view === 'packets' ? 'bg-gray-700' : 'bg-gray-800'
                }`}
                onClick={() => setView('packets')}
                aria-pressed={view === 'packets'}
              >
                Packets
              </button>
              <button
                className={`px-2 py-1 rounded border text-xs ${
                  view === 'flows' ? 'bg-gray-700' : 'bg-gray-800'
                }`}
                onClick={() => setView('flows')}
                aria-pressed={view === 'flows'}
              >
                Flows
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-xs uppercase tracking-wide text-gray-400">Export</span>
            <button
              type="button"
              onClick={handleExportPackets}
              className="px-2 py-1 bg-gray-700 rounded text-xs"
              disabled={!filteredPackets.length}
            >
              Export view JSON
            </button>
          </div>
        </div>
      </div>
      <div className="mx-3 mb-2">
        <Waterfall
          packets={timeline}
          colorRules={colorRules}
          viewIndex={Math.max(0, timeline.length - 100)}
          prefersReducedMotion={prefersReducedMotion.current}
        />
      </div>
      <div className="mx-3 mb-3">
        <BurstChart minutes={minuteData} />
      </div>
      <div className="flex-1 mx-3 mb-3 flex flex-col gap-3">
        {emptyState && (
          <div className="flex-1 rounded border border-gray-800 bg-gray-900/60 p-6 text-center text-sm text-gray-400">
            No packets loaded yet. Choose a sample capture or upload a pcap/pcapng file to begin.
          </div>
        )}
        {filteredEmpty && (
          <div className="rounded border border-gray-800 bg-gray-900/60 p-4 text-sm text-gray-400">
            No packets match the current filters. Adjust the display or BPF filters to continue.
          </div>
        )}
        {!emptyState && view === 'packets' && (
          <div className="flex-1 flex flex-col gap-3 min-h-0">
            <div className="rounded border border-gray-800 bg-black flex flex-col min-h-0">
              <div className="grid grid-cols-[8rem_8rem_8rem_6rem_5rem_1fr${hasTlsKeys ? '_10rem' : ''}] px-2 py-1 text-xs font-semibold bg-gray-900 text-gray-300">
                <button
                  type="button"
                  onClick={() => handleSort('Time')}
                  className="text-left"
                >
                  Time
                </button>
                <button
                  type="button"
                  onClick={() => handleSort('Source')}
                  className="text-left"
                >
                  Source
                </button>
                <button
                  type="button"
                  onClick={() => handleSort('Destination')}
                  className="text-left"
                >
                  Destination
                </button>
                <button
                  type="button"
                  onClick={() => handleSort('Protocol')}
                  className="text-left"
                >
                  Protocol
                </button>
                <button
                  type="button"
                  onClick={() => handleSort('Length')}
                  className="text-left"
                >
                  Length
                </button>
                <span>Info</span>
                {hasTlsKeys && <span>Plaintext</span>}
              </div>
              <div className="flex-1 overflow-auto" role="rowgroup" tabIndex={0} onKeyDown={handleRowKeyDown}>
                <List
                  rowCount={sortedPackets.length}
                  rowHeight={ROW_HEIGHT}
                  rowComponent={renderRow}
                  rowProps={{
                    items: sortedPackets,
                    selectedId: selectedPacketId,
                    onSelect: setSelectedPacketId,
                    hasPlaintext: hasTlsKeys,
                  }}
                  style={{
                    height: Math.max(120, Math.min(320, filteredPacketCount * ROW_HEIGHT)),
                    width: '100%',
                  }}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 min-h-[200px]">
              <div className="rounded border border-gray-800 bg-gray-900/70 p-3 text-xs text-gray-200 overflow-auto">
                {selectedPacket ? (
                  <>
                    <h3 className="text-sm font-semibold text-gray-300 mb-2">Decoded layers</h3>
                    <DecodeTree data={selectedPacket.layers} />
                  </>
                ) : (
                  <p className="text-gray-400">Select a packet to inspect decoded layers.</p>
                )}
              </div>
              <div className="rounded border border-gray-800 bg-black/80 p-3 text-xs text-green-400 overflow-auto">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-gray-300">Hex view</h3>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        selectedPacket &&
                        copyText(bytesToHexLines(selectedPacket.data).join('\n'))
                      }
                      className="px-2 py-1 bg-gray-700 rounded text-xs text-white"
                      disabled={!selectedPacket}
                    >
                      Copy hex
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        selectedPacket &&
                        copyText(bytesToBase64(selectedPacket.data))
                      }
                      className="px-2 py-1 bg-gray-700 rounded text-xs text-white"
                      disabled={!selectedPacket}
                    >
                      Copy base64
                    </button>
                  </div>
                </div>
                {selectedPacket ? (
                  <pre className="whitespace-pre-wrap">
                    {bytesToHexLines(selectedPacket.data).join('\n')}
                  </pre>
                ) : (
                  <p className="text-gray-500">Select a packet to view the hex dump.</p>
                )}
              </div>
            </div>
          </div>
        )}
        {!emptyState && view === 'flows' && (
          <div className="rounded border border-gray-800 bg-gray-900/60 p-3">
            <FlowGraph packets={filteredPackets} />
          </div>
        )}
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
};

export default WiresharkApp;
