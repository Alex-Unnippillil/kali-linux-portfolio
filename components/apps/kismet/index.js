import React, { useEffect, useRef, useState } from 'react';
import { getNetworkAlerts, lookupVendor } from './utils';

// Simple helpers to generate demo data
const randomHex = () => Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
const randomMac = () =>
  `${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}:${randomHex()}`;

const demoNetworks = () => [
  {
    ssid: 'CoffeeShopWiFi',
    strength: -45,
    mac: randomMac(),
    lat: 37.7749,
    lng: -122.4194,
  },
  {
    ssid: 'FreeAirport',
    strength: -70,
    mac: randomMac(),
    lat: 40.7128,
    lng: -74.006,
  },
  {
    ssid: 'HomeWiFi',
    strength: -30,
    mac: randomMac(),
    lat: 34.0522,
    lng: -118.2437,
  },
];

const randomNetwork = () => ({
  ssid: `Net${Math.floor(Math.random() * 1000)}`,
  strength: -20 - Math.floor(Math.random() * 80),
  mac: randomMac(),
  lat: Math.random() * 180 - 90,
  lng: Math.random() * 360 - 180,
});

const getMarkerStyle = (lat, lng) => {
  const x = ((lng + 180) / 360) * 100;
  const y = ((90 - lat) / 180) * 100;
  return { left: `${x}%`, top: `${y}%` };
};

const KismetApp = () => {
  const [networks, setNetworks] = useState([]);
  const [packets, setPackets] = useState([]);
  const [alert, setAlert] = useState(null);
  const audioCtxRef = useRef(null);

  const playBeep = () => {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!audioCtxRef.current && AudioContext) {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (!ctx) return;
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1000;
    osc.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
  };

  const triggerAlert = (a) => {
    const msg =
      a.type === 'new'
        ? `New network detected: ${a.ssid}`
        : `Signal change for ${a.ssid}`;
    setAlert(msg);
    playBeep();
    setTimeout(() => setAlert(null), 3000);
  };

  useEffect(() => {
    // In browsers we cannot access wireless cards directly. For demo purposes,
    // populate with static data and simulate packets.
    setNetworks(demoNetworks());

    const netInterval = setInterval(() => {
      setNetworks((prev) => {
        let updated = prev.map((n) => ({
          ...n,
          strength: n.strength + Math.floor(Math.random() * 10 - 5),
        }));
        if (Math.random() < 0.3) {
          updated = [...updated, randomNetwork()];
        }
        const alerts = getNetworkAlerts(prev, updated);
        alerts.forEach(triggerAlert);
        return updated;
      });
    }, 4000);

    const pktInterval = setInterval(() => {
      setPackets((prev) => [
        ...prev,
        { ts: Date.now(), from: randomMac(), to: randomMac() },
      ]);
    }, 1500);

    return () => {
      clearInterval(netInterval);
      clearInterval(pktInterval);
    };
  }, []);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="px-3 py-1 border-b border-gray-700 relative">
        <span className="font-bold">Kismet</span>
        {alert && (
          <div className="absolute inset-x-0 top-full bg-red-600 text-center text-xs py-1">
            {alert}
          </div>
        )}
      </div>
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/2 p-2 overflow-y-auto">
          <h2 className="text-sm font-semibold mb-2">Nearby Networks</h2>
          {networks.length ? (
            <ul>
              {networks.map((net) => (
                <li key={net.ssid} className="flex justify-between mb-1">
                  <div>
                    <span>{net.ssid}</span>
                    <span className="ml-2 text-gray-500 text-xs">
                      {lookupVendor(net.mac)}
                    </span>
                  </div>
                  <span className="text-gray-400 text-xs">{net.strength} dBm</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No networks detected.</p>
          )}
        </div>
        <div className="w-1/2 flex flex-col border-l border-gray-700">
          <div className="flex-1 p-2 overflow-hidden">
            <h2 className="text-sm font-semibold mb-2">Network Map</h2>
            <div className="relative w-full h-full bg-gray-800">
              {networks.map((net) => (
                <div
                  key={net.ssid}
                  className="absolute"
                  style={getMarkerStyle(net.lat, net.lng)}
                >
                  <div
                    className="w-2 h-2 bg-red-500 rounded-full"
                    title={`${net.ssid} (${net.strength} dBm)`}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 p-2 overflow-y-auto border-t border-gray-700">
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
    </div>
  );
};

export default KismetApp;

export const displayKismet = (addFolder, openApp) => {
  return <KismetApp addFolder={addFolder} openApp={openApp} />;
};

