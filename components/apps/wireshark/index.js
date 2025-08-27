// This component simulates packet capture using local JSON fixtures and avoids
// parsing user supplied PCAP data or establishing network connections.
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

  // Load packet data from the bundled fixture and send it to the worker.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof fetch === 'undefined') return;
    fetch('/demo-data/wireshark/packets.json')
      .then((res) => res.json())
      .then((data) => {
        setPackets(data);
        data.forEach((pkt) => workerRef.current?.postMessage(pkt));
      })
      .catch(() => {
        // ignore errors loading fixture
      });
  }, []);

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

  return (
    <div className="w-full h-full flex flex-col bg-black text-green-400">
      <div className="p-2 flex space-x-2 bg-gray-900">
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
          className="flex-1"
        />
      </div>
      <Waterfall
        packets={timeline}
        colorRules={colorRules}
        viewIndex={viewIndex}
        prefersReducedMotion={prefersReducedMotion.current}
      />
      <div className="flex-1 overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="bg-gray-800">
            <tr>
              <th className="px-2 py-1 text-left">Time</th>
              <th className="px-2 py-1 text-left">Source</th>
              <th className="px-2 py-1 text-left">Destination</th>
              <th className="px-2 py-1 text-left">Protocol</th>
              <th className="px-2 py-1 text-left">Info</th>
            </tr>
          </thead>
          <tbody>
            {packets.filter((p) => matchesFilter(p, filter)).map((p, i) => (
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
                <td className="px-2 py-1">{p.decrypted || p.info}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div aria-live="polite" className="sr-only">
        {announcement}
      </div>
    </div>
  );
};

export default WiresharkApp;
