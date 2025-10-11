import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import Waterfall from './Waterfall';
import BurstChart from './BurstChart';
import { protocolName, getRowColor, matchesDisplayFilter } from './utils';
import DecodeTree from './DecodeTree';
import FlowGraph from '../../../apps/wireshark/components/FlowGraph';
import FilterHelper from '../../../apps/wireshark/components/FilterHelper';
import ColorRuleEditor from '../../../apps/wireshark/components/ColorRuleEditor';
import { parsePcap } from '../../../utils/pcap';
import LabMode from '../../LabMode';
import fixtures from '../../../apps/wireshark/fixtures';

const toHex = (bytes) =>
  Array.from(bytes, (b, i) =>
    `${b.toString(16).padStart(2, '0')}${(i + 1) % 16 === 0 ? '\n' : ' '}`
  ).join('');


// Basic BPF-style filtering support
const matchesBpf = (packet, expr) => {
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

const WiresharkApp = ({ initialPackets = [] }) => {
  const [packets, setPackets] = useState(initialPackets);
  const [tlsKeys, setTlsKeys] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [filter, setFilter] = useState('');
  const [bpf, setBpf] = useState('');
  const [colorRules, setColorRules] = useState([]);
  const [paused, setPaused] = useState(false);
  const [viewIndex, setViewIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [view, setView] = useState('packets');
  const [error, setError] = useState('');
  const prefersReducedMotion = useRef(false);
  const [simulating, setSimulating] = useState(initialPackets.length > 0);
  const [fixtureId, setFixtureId] = useState(
    initialPackets.length ? 'custom' : fixtures[0]?.id ?? ''
  );
  const [labEnabled, setLabEnabled] = useState(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem('lab-mode') === 'true';
    } catch (err) {
      return false;
    }
  });
  const VISIBLE = 100;

  const selectedFixture = useMemo(
    () => fixtures.find((fixture) => fixture.id === fixtureId) || null,
    [fixtureId]
  );

  const timeline = useMemo(() => {
    let previous = null;
    return packets.map((pkt) => {
      const ts = Number(pkt.timestamp);
      const burstStart =
        previous === null || Number.isNaN(ts)
          ? true
          : ts - previous > 1000;
      previous = Number.isNaN(ts) ? previous : ts;
      return { ...pkt, burstStart };
    });
  }, [packets]);

  const minuteData = useMemo(() => {
    const counts = new Map();
    packets.forEach((pkt) => {
      const ts = Number(pkt.timestamp);
      if (Number.isNaN(ts)) return;
      const minute = ts > 1e9 ? Math.floor(ts / 60000) : Math.floor(ts / 60);
      counts.set(minute, (counts.get(minute) || 0) + 1);
    });
    return Array.from(counts.entries())
      .map(([minute, count]) => ({ minute, count }))
      .sort((a, b) => a.minute - b.minute);
  }, [packets]);

  const interfaces = [
    { name: 'eth0', type: 'wired' },
    { name: 'wlan0', type: 'wireless' },
  ];

  // Load persisted filter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('wireshark-filter');
      if (saved) setFilter(saved);
      prefersReducedMotion.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
      ).matches;
    }
  }, []);

  useEffect(() => {
    setSelectedPacket(null);
  }, [packets]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event) => {
      if (event?.detail && typeof event.detail.enabled === 'boolean') {
        setLabEnabled(event.detail.enabled);
      } else {
        try {
          setLabEnabled(window.localStorage.getItem('lab-mode') === 'true');
        } catch (err) {
          setLabEnabled(false);
        }
      }
    };
    window.addEventListener('lab-mode-changed', handler);
    return () => window.removeEventListener('lab-mode-changed', handler);
  }, []);

  useEffect(() => {
    if (initialPackets.length) return;
    if (!labEnabled) return;
    if (packets.length) return;
    if (fixtureId === 'custom') return;
    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (fixture) {
      setPackets(fixture.packets);
      setSimulating(true);
      setAnnouncement(`Loaded fixture: ${fixture.title}`);
    }
  }, [fixtureId, labEnabled, initialPackets.length, packets.length]);

  useEffect(() => {
    if (!paused) {
      setViewIndex(Math.max(0, timeline.length - VISIBLE));
    }
  }, [timeline, paused]);

  const handleFilterChange = (val) => {
    setFilter(val);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('wireshark-filter', val);
    }
  };


  const handleBpfChange = (e) => {
    setBpf(e.target.value);
  };

  const handleTLSKeyUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => setTlsKeys(reader.result);
      reader.readAsText(file);
    }
  };

  const handleFile = async (file) => {
    if (!labEnabled) {
      setError('Enable Lab Mode to import captures.');
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parsePcap(buffer);
      setPackets(parsed);
      setFixtureId('custom');
      setSimulating(true);
      setError('');
      setAnnouncement(`Loaded ${file.name}`);
    } catch (err) {
      setError(err.message || 'Unsupported file');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (!labEnabled) {
      setError('Enable Lab Mode to import captures.');
      return;
    }
    const file = e.dataTransfer.files?.[0];
    if (
      file &&
      (file.name.endsWith('.pcap') || file.name.endsWith('.pcapng'))
    ) {
      handleFile(file);
    } else {
      setError('Unsupported file format');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleFixtureSelect = (e) => {
    const nextId = e.target.value;
    setFixtureId(nextId);
    if (!labEnabled) {
      setAnnouncement('Enable Lab Mode to load fixtures.');
      return;
    }
    if (nextId === 'custom') {
      setSimulating(packets.length > 0);
      return;
    }
    const fixture = fixtures.find((f) => f.id === nextId);
    if (fixture) {
      setPackets(fixture.packets);
      setSimulating(true);
      setAnnouncement(`Loaded fixture: ${fixture.title}`);
    }
  };

  const startCapture = () => {
    if (!labEnabled) {
      setAnnouncement('Enable Lab Mode to load fixtures.');
      return;
    }
    if (fixtureId === 'custom') {
      setSimulating(packets.length > 0);
      setAnnouncement('Custom capture active.');
      return;
    }
    const fixture = fixtures.find((f) => f.id === fixtureId);
    if (fixture) {
      setPackets(fixture.packets);
      setSimulating(true);
      setAnnouncement(`Loaded fixture: ${fixture.title}`);
    }
  };

  const stopCapture = () => {
    setSimulating(false);
    setAnnouncement('Simulation paused. Capture data remains for review.');
  };

  const handleFixtureFilter = (preset) => {
    if (preset.target === 'bpf') {
      setBpf(preset.expression);
    } else {
      handleFilterChange(preset.expression);
    }
    setAnnouncement(`Applied ${preset.label} ${preset.target === 'bpf' ? 'capture' : 'display'} filter`);
  };

  const handlePause = () => {
    setPaused((p) => {
      const next = !p;
      setAnnouncement(next ? 'Capture paused' : 'Capture resumed');
      return next;
    });
  };

  const handleScrub = (e) => {
    const idx = parseInt(e.target.value, 10);
    setViewIndex(idx);
    setAnnouncement(`Viewing packets starting at index ${idx}`);
  };

  const protocols = Array.from(new Set(packets.map((p) => protocolName(p.protocol))));
  const filteredPackets = packets
    .filter((p) => matchesDisplayFilter(p, filter))
    .filter((p) => matchesBpf(p, bpf))
    .filter((p) => !protocolFilter || protocolName(p.protocol) === protocolFilter);
  const hasTlsKeys = !!tlsKeys;

  return (
    <LabMode>
      <div
        className="w-full h-full flex flex-col bg-black text-green-400 [container-type:inline-size]"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <p className="text-yellow-300 text-xs p-2 bg-gray-900">
          Bundled capture for lab use only. No live traffic.
        </p>
        {!labEnabled && (
          <p className="text-orange-300 text-xs p-2 bg-gray-900">
            Enable Lab Mode to load fixtures or import custom captures.
          </p>
        )}
        {error && (
          <p className="text-red-400 text-xs p-2 bg-gray-900">{error}</p>
        )}
        <div className="p-2 grid gap-2 md:grid-cols-2 bg-gray-900">
          {interfaces.map((iface) => (
            <div
              key={iface.name}
              className="flex items-center justify-between bg-gray-800 rounded p-2"
            >
              <div className="flex items-center space-x-2">
                <Image
                  src={
                    iface.type === 'wired'
                      ? '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg'
                      : '/themes/Yaru/status/network-wireless-signal-good-symbolic.svg'
                  }
                  alt={iface.type}
                  width={24}
                  height={24}
                />
                <span className="text-white">{iface.name}</span>
              </div>
              <div className="flex items-center space-x-1">
                <button
                  onClick={startCapture}
                  aria-label={`start capture on ${iface.name}`}
                  className="p-1 disabled:opacity-40"
                  disabled={!labEnabled || simulating}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                </button>
                <button
                  onClick={stopCapture}
                  aria-label={`stop capture on ${iface.name}`}
                  className="p-1 disabled:opacity-40"
                  disabled={!labEnabled || !simulating}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    className="w-6 h-6"
                  >
                    <path d="M6 6h12v12H6z" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-2 flex space-x-2 bg-gray-900 flex-wrap">
          <select
            value={fixtureId}
            onChange={handleFixtureSelect}
            className="px-2 py-1 bg-gray-800 rounded text-white"
            aria-label="Choose capture fixture"
          >
            {fixtures.map((fixture) => (
              <option key={fixture.id} value={fixture.id}>
                {fixture.title}
              </option>
            ))}
            <option value="custom">Custom capture</option>
          </select>
          <button
            onClick={startCapture}
            disabled={!labEnabled || simulating}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            Start
          </button>
          <button
            onClick={stopCapture}
            disabled={!labEnabled || !simulating}
            className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
          >
            Stop
          </button>
          <input
            type="file"
            accept=".keys,.txt,.log"
            onChange={handleTLSKeyUpload}
            aria-label="TLS key file"
            className="px-2 py-1 bg-gray-800 rounded text-white"
          />
          <FilterHelper value={filter} onChange={handleFilterChange} />
          <input
            value={bpf}
            onChange={handleBpfChange}
            list="bpf-suggestions"
            placeholder="BPF filter (e.g. tcp, port 80)"
            aria-label="BPF filter"
            className="px-2 py-1 bg-gray-800 rounded text-white"
          />
          <datalist id="bpf-suggestions">
            <option value="tcp" />
            <option value="udp" />
            <option value="icmp" />
            <option value="port 80" />
            <option value="host 10.0.0.1" />
          </datalist>
          <a
            href="https://www.wireshark.org/docs/dfref/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 underline whitespace-nowrap"
          >
            Display filter docs
          </a>
          <ColorRuleEditor rules={colorRules} onChange={setColorRules} />
          <button
            onClick={handlePause}
            className="px-3 py-1 bg-gray-700 rounded"
            aria-pressed={paused}
          >
            {paused ? 'Resume' : 'Pause'}
          </button>
          <input
            type="range"
            min="0"
            max={Math.max(0, timeline.length - VISIBLE)}
            value={viewIndex}
            onChange={handleScrub}
            aria-label="Scrub timeline"
            className="flex-1 waterfall-cq"
          />
        </div>
        {selectedFixture && (
          <div className="bg-gray-950 border-y border-gray-800 p-3 text-xs text-white grid gap-3 lg:grid-cols-2">
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-yellow-300">
                {selectedFixture.title}
              </h3>
              <p className="text-gray-200 leading-snug">
                {selectedFixture.description}
              </p>
              <ul className="list-disc list-inside space-y-1 text-gray-300">
                {selectedFixture.callouts.map((note) => (
                  <li key={note}>{note}</li>
                ))}
              </ul>
              <div>
                <span className="text-gray-400 font-semibold">Sources</span>
                <ul className="list-disc list-inside text-blue-300">
                  {selectedFixture.sources.map((source) => (
                    <li key={source.url}>
                      <a
                        href={source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline text-blue-300"
                      >
                        {source.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-yellow-300">
                Recommended filters
              </h3>
              <ul className="space-y-2">
                {selectedFixture.filters.map((preset) => (
                  <li
                    key={`${preset.target}-${preset.expression}`}
                    className="rounded border border-gray-800 bg-gray-900 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-white">
                        {preset.label}
                      </span>
                      <span className="rounded bg-gray-700 px-2 py-0.5 text-[10px] uppercase tracking-wide">
                        {preset.target === 'bpf' ? 'Capture' : 'Display'}
                      </span>
                    </div>
                    <p className="mt-1 text-gray-300">{preset.explanation}</p>
                    <code className="mt-1 inline-block rounded bg-black px-2 py-1 text-[11px] text-green-300">
                      {preset.expression}
                    </code>
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={() => handleFixtureFilter(preset)}
                        className="px-2 py-1 bg-gray-700 rounded text-white text-xs"
                      >
                        Apply
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
        <div className="waterfall-cq">
          <Waterfall
            packets={timeline}
            colorRules={colorRules}
            viewIndex={viewIndex}
            prefersReducedMotion={prefersReducedMotion.current}
          />
        </div>
        <BurstChart minutes={minuteData} />
      <div className="p-2 flex space-x-2 bg-gray-900 overflow-x-auto">
        <button
          className={`px-2 py-1 rounded border ${
            protocolFilter === '' ? 'bg-gray-700' : 'bg-gray-800'
          }`}
          onClick={() => setProtocolFilter('')}
        >
          All
        </button>
        {protocols.map((proto) => (
          <button
            key={proto}
            className={`px-2 py-1 rounded border ${
              protocolFilter === proto ? 'bg-gray-700' : 'bg-gray-800'
            }`}
            onClick={() => setProtocolFilter(proto)}
          >
            {proto}
          </button>
        ))}
      </div>
      <div className="p-2 flex space-x-2 bg-gray-900">
        <button
          className={`px-2 py-1 rounded border ${
            view === 'packets' ? 'bg-gray-700' : 'bg-gray-800'
          }`}
          onClick={() => setView('packets')}
        >
          Packets
        </button>
        <button
          className={`px-2 py-1 rounded border ${
            view === 'flows' ? 'bg-gray-700' : 'bg-gray-800'
          }`}
          onClick={() => setView('flows')}
        >
          Flows
        </button>
      </div>
      {view === 'packets' ? (
        <>
          <div className="flex-1 overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-800">
                <tr>
                  <th className="px-2 py-1 text-left">Time</th>
                  <th className="px-2 py-1 text-left">Length</th>
                  <th className="px-2 py-1 text-left">Summary</th>
                  {hasTlsKeys && (
                    <th className="px-2 py-1 text-left">Plaintext</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredPackets.map((p, i) => {
                  const isMatch = matchesDisplayFilter(p, filter);
                  return (
                    <tr
                      key={i}
                      onClick={() => setSelectedPacket(p)}
                      className={`${i % 2 ? 'bg-gray-900' : 'bg-gray-800'} ${getRowColor(
                        p,
                        colorRules
                      )} ${isMatch ? 'bg-yellow-900' : ''} ${
                        selectedPacket === p ? 'outline outline-1 outline-yellow-400' : ''
                      }`}
                    >
                      <td className="px-2 py-1 whitespace-nowrap">{p.timestamp}</td>
                      <td className="px-2 py-1 whitespace-nowrap">{p.len}</td>
                      <td className="px-2 py-1">{p.info}</td>
                      {hasTlsKeys && (
                        <td className="px-2 py-1">{p.plaintext || p.decrypted}</td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="p-2 bg-gray-900 overflow-auto text-xs h-40">
            {selectedPacket ? (
              <>
                <DecodeTree data={selectedPacket.layers} />
                {selectedPacket.data && (
                  <pre className="mt-2 whitespace-pre-wrap">
                    {toHex(selectedPacket.data)}
                  </pre>
                )}
              </>
            ) : (
              <p className="text-gray-400">Select a packet to view details</p>
            )}
          </div>
        </>
      ) : (
        <FlowGraph packets={filteredPackets} />
      )}
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
      <style jsx>{`
        @container (max-width: 600px) {
          .waterfall-cq {
            display: none;
          }
        }
      `}</style>
      </div>
    </LabMode>
  );
};

export default WiresharkApp;
