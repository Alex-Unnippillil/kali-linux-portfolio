import React, { useEffect, useRef, useState } from 'react';
import Waterfall from './Waterfall';
import { protocolName, getRowColor } from './utils';
import DecodeTree from './DecodeTree';
import FlowDiagram from './FlowDiagram';

// Determine if a packet matches the active filter expression
const matchesFilter = (packet, filter) => {
  if (!filter) return true;
  const term = filter.toLowerCase();
  return (
    packet.src.toLowerCase().includes(term) ||
    packet.dest.toLowerCase().includes(term) ||
    protocolName(packet.protocol).toLowerCase().includes(term) ||
    (packet.info || '').toLowerCase().includes(term) ||
    (packet.decrypted || '').toLowerCase().includes(term)
  );
};

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
  const [colorRuleText, setColorRuleText] = useState('[]');
  const [colorRules, setColorRules] = useState([]);
  const [paused, setPaused] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
  const [selectedPacket, setSelectedPacket] = useState(null);
  const [view, setView] = useState('packets');
  const workerRef = useRef(null);
  const pausedRef = useRef(false);
  const prefersReducedMotion = useRef(false);
  const VISIBLE = 100;

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

  const handleFilterChange = (e) => {
    const val = e.target.value;
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

  const handleColorRulesChange = (e) => {
    const text = e.target.value;
    setColorRuleText(text);
    try {
      const parsed = JSON.parse(text);
      setColorRules(Array.isArray(parsed) ? parsed : []);
    } catch {
      // ignore invalid JSON
    }
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
    .filter((p) => matchesFilter(p, filter))
    .filter((p) => matchesBpf(p, bpf))
    .filter((p) => !protocolFilter || protocolName(p.protocol) === protocolFilter);
  const hasTlsKeys = !!tlsKeys;

  return (
    <div className="w-full h-full flex flex-col bg-black text-green-400 [container-type:inline-size]">
      <p className="text-yellow-300 text-xs p-2 bg-gray-900">
        Bundled capture for lab use only. No live traffic.
      </p>
      <div className="p-2 flex space-x-2 bg-gray-900 flex-wrap">
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
          accept=".keys,.txt"
          onChange={handleTLSKeyUpload}
          aria-label="TLS key file"
          className="px-2 py-1 bg-gray-800 rounded text-white"
        />
        <input
          value={filter}
          onChange={handleFilterChange}
          placeholder="Quick search (e.g. tcp)"
          aria-label="Quick search"
          className="px-2 py-1 bg-gray-800 rounded text-white"
        />
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
        <input
          value={colorRuleText}
          onChange={handleColorRulesChange}
          placeholder='Color rules JSON'
          className="px-2 py-1 bg-gray-800 rounded text-white"
        />
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
                  <th className="px-2 py-1 text-left">Source</th>
                  <th className="px-2 py-1 text-left">Destination</th>
                  <th className="px-2 py-1 text-left">Protocol</th>
                  <th className="px-2 py-1 text-left">Info</th>
                  {hasTlsKeys && (
                    <th className="px-2 py-1 text-left">Decrypted</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredPackets.map((p, i) => (
                  <tr
                    key={i}
                    onClick={() => setSelectedPacket(p)}
                    className={`${i % 2 ? 'bg-gray-900' : 'bg-gray-800'} ${getRowColor(
                      p,
                      colorRules
                    )} ${selectedPacket === p ? 'outline outline-1 outline-yellow-400' : ''}`}
                  >
                    <td className="px-2 py-1 whitespace-nowrap">{p.timestamp}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{p.src}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{p.dest}</td>
                    <td className="px-2 py-1 whitespace-nowrap">{protocolName(p.protocol)}</td>
                    <td className="px-2 py-1">{p.info}</td>
                    {hasTlsKeys && (
                      <td className="px-2 py-1">{p.decrypted}</td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-2 bg-gray-900 overflow-auto text-xs h-40">
            {selectedPacket ? (
              <DecodeTree data={selectedPacket.layers} />
            ) : (
              <p className="text-gray-400">Select a packet to view details</p>
            )}
          </div>
        </>
      ) : (
        <FlowDiagram packets={filteredPackets} />
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
