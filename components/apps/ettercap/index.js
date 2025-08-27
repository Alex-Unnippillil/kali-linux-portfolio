import React, { useEffect, useRef, useState } from 'react';

const protocols = ['TCP', 'UDP', 'ICMP', 'ARP', 'HTTP', 'DNS'];

const generatePacket = (a, b) => {
  const [src, dst] = Math.random() > 0.5 ? [a, b] : [b, a];
  return {
    time: new Date().toLocaleTimeString(),
    src,
    dst,
    protocol: protocols[Math.floor(Math.random() * protocols.length)],
    length: Math.floor(Math.random() * 1500) + 60,
  };
};

const EttercapApp = () => {
  const [target1, setTarget1] = useState('');
  const [target2, setTarget2] = useState('');
  const [running, setRunning] = useState(false);
  const [traffic, setTraffic] = useState([]);
  const intervalRef = useRef(null);

  const displayTraffic = traffic.slice(0, 20);
  const nodes = Array.from(
    new Set(displayTraffic.flatMap((pkt) => [pkt.src, pkt.dst]))
  );
  const width = 400;
  const height = 200;
  const radius = Math.min(width, height) / 2 - 30;
  const angleStep = (2 * Math.PI) / (nodes.length || 1);
  const positions = nodes.reduce((acc, node, idx) => {
    acc[node] = {
      x: width / 2 + radius * Math.cos(angleStep * idx),
      y: height / 2 + radius * Math.sin(angleStep * idx),
    };
    return acc;
  }, {});

  useEffect(() => {
    return () => clearInterval(intervalRef.current);
  }, []);

  const startSession = () => {
    if (!target1 || !target2) return;
    setTraffic([]);
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setTraffic((t) => [generatePacket(target1, target2), ...t]);
    }, 1000);
  };

  const stopSession = () => {
    clearInterval(intervalRef.current);
    setRunning(false);
  };

  return (
    <div className="h-full w-full bg-ub-cool-grey text-white p-4 flex flex-col">
      <div className="flex mb-4 space-x-2">
        <input
          className="flex-1 p-2 rounded text-black"
          placeholder="Target 1"
          value={target1}
          onChange={(e) => setTarget1(e.target.value)}
          disabled={running}
        />
        <input
          className="flex-1 p-2 rounded text-black"
          placeholder="Target 2"
          value={target2}
          onChange={(e) => setTarget2(e.target.value)}
          disabled={running}
        />
        {!running ? (
          <button
            className="px-4 py-2 bg-green-600 rounded"
            onClick={startSession}
          >
            Start
          </button>
        ) : (
          <button
            className="px-4 py-2 bg-red-600 rounded"
            onClick={stopSession}
          >
            Stop
          </button>
        )}
      </div>
      <div className="mb-4 h-48 bg-gray-800 rounded">
        <svg viewBox="0 0 400 200" className="w-full h-full">
          <defs>
            {protocols.map((p) => (
              <marker
                id={`arrow-${p}`}
                key={p}
                markerWidth="10"
                markerHeight="10"
                refX="9"
                refY="3"
                orient="auto"
                markerUnits="strokeWidth"
              >
                <path d="M0,0 L0,6 L9,3 z" className={p} />
              </marker>
            ))}
          </defs>
          {displayTraffic.map((pkt, idx) => (
            <line
              key={idx}
              x1={positions[pkt.src]?.x || 0}
              y1={positions[pkt.src]?.y || 0}
              x2={positions[pkt.dst]?.x || 0}
              y2={positions[pkt.dst]?.y || 0}
              className={`link ${pkt.protocol}`}
              markerEnd={`url(#arrow-${pkt.protocol})`}
            />
          ))}
          {nodes.map((node) => (
            <g key={node}>
              <circle
                cx={positions[node].x}
                cy={positions[node].y}
                r="15"
                className="node"
              />
              <text
                x={positions[node].x}
                y={positions[node].y - 20}
                textAnchor="middle"
                className="label"
              >
                {node}
              </text>
            </g>
          ))}
        </svg>
      </div>
      <div className="flex-1 overflow-auto bg-gray-800 rounded">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-700">
              <th className="p-1 text-left">Time</th>
              <th className="p-1 text-left">Source</th>
              <th className="p-1 text-left">Destination</th>
              <th className="p-1 text-left">Protocol</th>
              <th className="p-1 text-left">Length</th>
            </tr>
          </thead>
          <tbody>
            {traffic.map((pkt, idx) => (
              <tr key={idx} className={idx % 2 ? 'bg-gray-700' : ''}>
                <td className="p-1 whitespace-nowrap">{pkt.time}</td>
                <td className="p-1 break-all">{pkt.src}</td>
                <td className="p-1 break-all">{pkt.dst}</td>
                <td className="p-1">{pkt.protocol}</td>
                <td className="p-1">{pkt.length}</td>
              </tr>
            ))}
            {!traffic.length && (
              <tr>
                <td className="p-4 text-center" colSpan="5">
                  {running ? 'Capturing traffic...' : 'No traffic'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <style jsx>{`
        .node {
          fill: #fff;
          stroke: #333;
          stroke-width: 2px;
        }
        .link {
          stroke-width: 2px;
        }
        .label {
          fill: #fff;
          font-size: 10px;
        }
        .TCP {
          stroke: #1f77b4;
          fill: #1f77b4;
        }
        .UDP {
          stroke: #2ca02c;
          fill: #2ca02c;
        }
        .ICMP {
          stroke: #ff7f0e;
          fill: #ff7f0e;
        }
        .ARP {
          stroke: #d62728;
          fill: #d62728;
        }
        .HTTP {
          stroke: #9467bd;
          fill: #9467bd;
        }
        .DNS {
          stroke: #8c564b;
          fill: #8c564b;
        }
      `}</style>
    </div>
  );
};

export default EttercapApp;

export const displayEttercap = () => <EttercapApp />;

