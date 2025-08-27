import React, { useEffect, useRef, useState } from 'react';
import Waterfall from './Waterfall';
import { protocolName, getRowColor } from './utils';

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

const WiresharkApp = ({ initialPackets = [] }) => {
  const [packets, setPackets] = useState(initialPackets);
  const [socket, setSocket] = useState(null);
  const [tlsKeys, setTlsKeys] = useState('');
  const [protocolFilter, setProtocolFilter] = useState('');
  const [filter, setFilter] = useState('');
  const [colorRuleText, setColorRuleText] = useState('[]');
  const [colorRules, setColorRules] = useState([]);
  const [paused, setPaused] = useState(false);
  const [timeline, setTimeline] = useState([]);
  const [viewIndex, setViewIndex] = useState(0);
  const [announcement, setAnnouncement] = useState('');
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
    if (typeof window === 'undefined' || typeof Worker === 'undefined') return;
    const worker = new Worker(new URL('./burstWorker.js', import.meta.url));
    worker.onmessage = (e) => {
      if (e.data.type === 'burst') {
        setAnnouncement(`Burst starting at ${e.data.start}`);
      }
      if (e.data.type === 'timeline') {
        setTimeline(e.data.timeline);
      }
    };
    workerRef.current = worker;
    return () => worker.terminate();
  }, []);

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
    .filter((p) => !protocolFilter || protocolName(p.protocol) === protocolFilter);
  const hasTlsKeys = !!tlsKeys;

  return (
    <div className="w-full h-full flex flex-col bg-black text-green-400 [container-type:inline-size]">
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
          placeholder="Filter expression"
          className="px-2 py-1 bg-gray-800 rounded text-white"
        />
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
                className={`${i % 2 ? 'bg-gray-900' : 'bg-gray-800'} ${getRowColor(
                  p,
                  colorRules
                )}`}
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
