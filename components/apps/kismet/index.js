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
  const [channel, setChannel] = useState(1);
  const [hopRate, setHopRate] = useState(0);
  const [channelHistory, setChannelHistory] = useState([]);

  useEffect(() => {
    // In browsers we cannot access wireless cards directly. For demo purposes,
    // populate with static data and simulate packets and channel hopping.
    setNetworks(demoNetworks());

    const pktInterval = setInterval(() => {
      setPackets((prev) => [
        ...prev,
        { ts: Date.now(), from: randomMac(), to: randomMac() },
      ]);
    }, 1500);

    // Simulate channel hopping and hop rate measurement
    const channels = Array.from({ length: 11 }, (_, i) => i + 1); // 1-11
    let hops = 0;
    const hopInterval = setInterval(() => {
      const newChannel = channels[Math.floor(Math.random() * channels.length)];
      setChannel(newChannel);
      hops += 1;
      setChannelHistory((prev) => {
        const updated = [...prev, { ts: Date.now(), channel: newChannel }];
        try {
          localStorage.setItem('kismetChannelHistory', JSON.stringify(updated));
        } catch (e) {
          // ignore write errors
        }
        return updated;
      });
    }, 2000);

    const rateInterval = setInterval(() => {
      setHopRate(hops / 2); // since hop interval is 2s, divide by 2 for hops/sec
      hops = 0;
    }, 2000);

    // Load existing history on mount
    try {
      const saved = JSON.parse(localStorage.getItem('kismetChannelHistory') || '[]');
      if (Array.isArray(saved)) setChannelHistory(saved);
    } catch (e) {
      // ignore read errors
    }

    return () => {
      clearInterval(pktInterval);
      clearInterval(hopInterval);
      clearInterval(rateInterval);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="px-3 py-1 border-b border-gray-700">
        <span className="font-bold">Kismet</span>
      </div>
      <div className="px-3 py-1 border-b border-gray-700 text-xs flex justify-between">
        <span>Channel: {channel}</span>
        <span>Hop rate: {hopRate.toFixed(1)} hops/sec</span>
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
          <div className="mt-4">
            <h2 className="text-sm font-semibold mb-2">Channel History</h2>
            {channelHistory.length ? (
              <ul>
                {channelHistory.slice(-100).map((entry, idx) => (
                  <li key={`${entry.ts}-${idx}`} className="text-xs mb-1">
                    [{new Date(entry.ts).toLocaleTimeString()}] ch {entry.channel}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-gray-400 text-sm">No channel activity.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

