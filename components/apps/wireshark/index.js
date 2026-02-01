import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Waterfall from './Waterfall';
import BurstChart from './BurstChart';
import { protocolName, getRowColor, matchesDisplayFilter } from './utils';
import DecodeTree from './DecodeTree';
import FlowGraph from '../../../apps/wireshark/components/FlowGraph';
import FilterHelper from '../../../apps/wireshark/components/FilterHelper';
import ColorRuleEditor from '../../../apps/wireshark/components/ColorRuleEditor';
import { parsePcap } from '../../../utils/pcap';
import SimulationBanner from '../SimulationBanner';

const toHex = (bytes) =>
  Array.from(bytes, (b, i) =>
    `${b.toString(16).padStart(2, '0')}${(i + 1) % 16 === 0 ? '\n' : ' '}`
  ).join('');

const sampleCaptures = [
  {
    id: 'http',
    label: 'HTTP Sample',
    path: '/samples/wireshark/http.pcap',
    note: 'Simulated web browsing with HTTP requests and responses.'
  },
  {
    id: 'dns',
    label: 'DNS Sample',
    path: '/samples/wireshark/dns.pcap',
    note: 'Simulated DNS lookups across internal resolver traffic.'
  }
];

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
  const [socket, setSocket] = useState(null);
  const [tlsKeys, setTlsKeys] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [filter, setFilter] = useState('');
  const [bpf, setBpf] = useState('');
  const [colorRules, setColorRules] = useState([]);
  const [paused, setPaused] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [minuteData, setMinuteData] = useState([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [view, setView] = useState('packets');
  const [error, setError] = useState('');
  const [activeSampleId, setActiveSampleId] = useState(sampleCaptures[0].id);
  const [sampleNote, setSampleNote] = useState(sampleCaptures[0].note);
  const workerRef = useRef(null);
  const pausedRef = useRef(false);
  const prefersReducedMotion = useRef(false);
  const VISIBLE = 100;

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

  // instantiate worker for burst grouping
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof Worker === 'function') {
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
      // seed worker with any bundled packets
      initialPackets.forEach((pkt) => worker.postMessage(pkt));
      workerRef.current = worker;
      return () => worker.terminate();
    }
    return undefined;
  }, [initialPackets]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

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
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parsePcap(buffer);
      setPackets(parsed);
      setTimeline(parsed);
      setSampleNote('Loaded custom capture file locally.');
      setError('');
    } catch (err) {
      setError(err.message || 'Unsupported file');
    }
  };

  const handleSampleLoad = async () => {
    const sample = sampleCaptures.find((s) => s.id === activeSampleId);
    if (!sample) return;
    try {
      const res = await fetch(sample.path);
      const buffer = await res.arrayBuffer();
      const parsed = parsePcap(buffer);
      setPackets(parsed);
      setTimeline(parsed);
      setSampleNote(sample.note);
      setError('');
    } catch (err) {
      setError(err.message || 'Failed to load sample capture');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
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

  const startCapture = () => {
    if (socket || typeof window === 'undefined') return;
    const ws = new WebSocket('ws://localhost:8080');
    ws.onopen = () => {
      if (tlsKeys) {
        ws.send(JSON.stringify({ type: 'tlsKeys', keys: tlsKeys }));
      }
    };
    ws.onmessage = (event) => {
      try {
        const pkt = JSON.parse(event.data);
        setPackets((prev) => [pkt, ...prev].slice(0, 500));
        if (!pausedRef.current) {
          workerRef.current?.postMessage(pkt);
        }
      } catch (e) {
        // ignore malformed packets
      }
    };
    ws.onclose = () => setSocket(null);
    setSocket(ws);
  };

  const stopCapture = () => {
    if (socket) {
      socket.close();
      setSocket(null);
    }
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
    <div
      className="w-full h-full flex flex-col bg-black text-green-400 [container-type:inline-size]"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <div className="p-2 bg-gray-900">
        <SimulationBanner
          toolName="Wireshark"
          message="Capture files are bundled for simulations. Live capture is not enabled in this demo."
        />
      </div>
      <p className="text-yellow-300 text-xs p-2 bg-gray-900">
        Bundled capture for lab use only. No live traffic.
      </p>
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
                className="p-1"
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
                className="p-1"
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
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={activeSampleId}
            onChange={(e) => setActiveSampleId(e.target.value)}
            aria-label="Select sample capture"
            className="px-2 py-1 bg-gray-800 rounded text-white"
          >
            {sampleCaptures.map((sample) => (
              <option key={sample.id} value={sample.id}>
                {sample.label}
              </option>
            ))}
          </select>
          <button
            onClick={handleSampleLoad}
            className="px-3 py-1 bg-gray-700 rounded"
          >
            Load Sample
          </button>
          {sampleNote && <span className="text-xs text-gray-300">{sampleNote}</span>}
        </div>
        <button
          onClick={startCapture}
          disabled={!!socket}
          className="px-3 py-1 bg-gray-700 rounded disabled:opacity-50"
        >
          Start
        </button>
        <button
          onClick={stopCapture}
          disabled={!socket}
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
  );
};

export default WiresharkApp;
