import React, { useEffect, useState } from 'react';

// Simple helpers to generate demo data
const demoNetworks = () => [
  { ssid: 'CoffeeShopWiFi', strength: -45, angle: Math.random() * 360 },
  { ssid: 'FreeAirport', strength: -70, angle: Math.random() * 360 },
  { ssid: 'HomeWiFi', strength: -30, angle: Math.random() * 360 },
];

const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
const randomMac = () =>
  `${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}`;

const KismetApp = () => {
  const [networks, setNetworks] = useState([]);
  const [packets, setPackets] = useState([]);

  const getCoords = ({ strength, angle }) => {
    const clamped = Math.min(Math.max(strength, -90), -30);
    const distance = 1 - (clamped + 90) / 60; // 0 near center, 1 at edge
    const r = distance * 90;
    const rad = (angle * Math.PI) / 180;
    return {
      x: 100 + r * Math.cos(rad),
      y: 100 + r * Math.sin(rad),
    };
  };

  useEffect(() => {
    // In browsers we cannot access wireless cards directly. For demo purposes,
    // populate with static data and simulate packets.
    setNetworks(demoNetworks());

    const interval = setInterval(() => {
      setPackets((prev) => [
        ...prev,
        { ts: Date.now(), from: randomMac(), to: randomMac() },
      ]);
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="px-3 py-1 border-b border-gray-700">
        <span className="font-bold">Kismet</span>
      </div>
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/2 p-2 overflow-y-auto">
          <h2 className="text-sm font-semibold mb-2">Nearby Networks</h2>
          <div className="flex justify-center mb-4">
            <svg viewBox="0 0 200 200" className="w-40 h-40 text-green-400">
              <circle cx="100" cy="100" r="90" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle
                cx="100"
                cy="100"
                r="60"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                opacity="0.5"
              />
              <circle
                cx="100"
                cy="100"
                r="30"
                stroke="currentColor"
                strokeWidth="1"
                fill="none"
                opacity="0.5"
              />
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="10"
                stroke="currentColor"
                strokeWidth="2"
                className="radar-line"
              />
              {networks.map((net) => {
                const { x, y } = getCoords(net);
                return (
                  <g key={net.ssid}>
                    <circle cx={x} cy={y} r="2" className="fill-current" />
                    <circle cx={x} cy={y} r="2" className="ping" />
                  </g>
                );
              })}
            </svg>
          </div>
          {networks.length ? (
            <ul>
              {networks.map((net) => (
                <li key={net.ssid} className="flex justify-between mb-1">
                  <span>{net.ssid}</span>
                  <span className="text-gray-400 text-xs">{net.strength} dBm</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No networks detected.</p>
          )}
        </div>
        <div className="w-1/2 p-2 overflow-y-auto border-l border-gray-700">
          <h2 className="text-sm font-semibold mb-2">Packet Capture</h2>
          {packets.length ? (
            <ul>
              {packets.slice(-100).map((pkt, idx) => (
                <li key={`${pkt.ts}-${idx}`} className="text-xs mb-1">
                  [{new Date(pkt.ts).toLocaleTimeString()}] {pkt.from} → {pkt.to}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No packets captured.</p>
          )}
        </div>
      </div>
      <style jsx>{`
      .radar-line {
        transform-origin: 100px 100px;
        transform-box: fill-box;
        animation: sweep 5s linear infinite;
      }
      @keyframes sweep {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }
      .ping {
        fill: currentColor;
        transform-origin: center;
        transform-box: fill-box;
        animation: ping 2s ease-out infinite;
        opacity: 0;
      }
      @keyframes ping {
        0% {
          opacity: 0.8;
          transform: scale(0.2);
        }
        100% {
          opacity: 0;
          transform: scale(2);
        }
      }
    `}</style>
    </div>
  );
};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

