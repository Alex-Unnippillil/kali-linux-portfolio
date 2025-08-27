import React, { useEffect, useState } from 'react';

// Simple line chart to display packets per second
const PacketsPerSecondChart = ({ data = [] }) => {
  if (!data.length) return <div className="chart-container" />;

  const max = Math.max(...data, 1);
  const points = data
    .map((count, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (count / max) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="chart-container">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          points={points}
        />
      </svg>
    </div>
  );
};

const protocolName = (proto) => {
  switch (proto) {
    case 6:
      return 'TCP';
    case 17:
      return 'UDP';
    case 1:
      return 'ICMP';
    default:
      return proto;
  }
};

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

// Determine the color class for a packet based on user rules
export const getRowColor = (packet, rules) => {
  const proto = protocolName(packet.protocol);
  const rule = rules.find(
    (r) =>
      (r.protocol && r.protocol === proto) ||
      (r.ip && (packet.src === r.ip || packet.dest === r.ip))
  );
  return rule ? rule.color : '';
};

const WiresharkApp = ({ initialPackets = [] }) => {
  const [packets, setPackets] = useState(initialPackets);
  const [socket, setSocket] = useState(null);
  const [tlsKeys, setTlsKeys] = useState('');
  const [filter, setFilter] = useState('');
  const [colorRuleText, setColorRuleText] = useState('[]');
  const [colorRules, setColorRules] = useState([]);
  const [pps, setPps] = useState([]); // packets per second data

  // Load persisted filter on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('wireshark-filter');
      if (saved) setFilter(saved);
    }
  }, []);

  const handleFilterChange = (e) => {
    const val = e.target.value;
    setFilter(val);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('wireshark-filter', val);
    }
  };

  const handleTLSKeyChange = (e) => setTlsKeys(e.target.value);

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
        const now = Math.floor(Date.now() / 1000);
        setPackets((prev) => [pkt, ...prev].slice(0, 500));
        setPps((prev) => {
          const next = [...prev];
          if (next.length && next[next.length - 1].t === now) {
            next[next.length - 1].c += 1;
          } else {
            next.push({ t: now, c: 1 });
          }
          return next.slice(-60);
        });
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

  return (
    <div className="w-full h-full flex flex-col bg-black text-green-400">
      <div className="p-2 flex space-x-2 bg-gray-900">
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
          value={tlsKeys}
          onChange={handleTLSKeyChange}
          placeholder="TLS keys"
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
      </div>
      <PacketsPerSecondChart data={pps.map((p) => p.c)} />
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
    </div>
  );
};

export default WiresharkApp;
