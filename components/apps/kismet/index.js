import React, { useEffect, useState } from 'react';

// Simple helpers to generate demo data
const demoNetworks = () => [
  { ssid: 'CoffeeShopWiFi', strength: -45 },
  { ssid: 'FreeAirport', strength: -70 },
  { ssid: 'HomeWiFi', strength: -30 },
];

const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
const randomMac = () =>
  `${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}`;

const KismetApp = () => {
  const [networks, setNetworks] = useState([]);
  const [packets, setPackets] = useState([]);

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
    </div>
  );
};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

