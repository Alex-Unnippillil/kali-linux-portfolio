import React, { useMemo, useState } from 'react';

// Mock access point data used for demonstration only. No real scanning occurs.
const mockAps = [
  { ssid: 'CoffeeShopWiFi', strength: -45, channel: 6, band: '2.4' },
  { ssid: 'FreeAirport', strength: -70, channel: 36, band: '5' },
  { ssid: 'HomeWiFi', strength: -30, channel: 11, band: '2.4' },
  { ssid: 'Library', strength: -65, channel: 1, band: '2.4' },
  { ssid: 'OfficeNet', strength: -50, channel: 44, band: '5' },
];

// Sample alerts displayed with explanations
const mockAlerts = [
  {
    title: 'Rogue AP detected',
    explanation: 'An unauthorized access point "EvilTwin" is broadcasting nearby.',
  },
  {
    title: 'Weak encryption',
    explanation: 'Network "CoffeeShopWiFi" uses deprecated WEP encryption.',
  },
];

const bands = [
  { label: 'All', value: 'all' },
  { label: '2.4 GHz', value: '2.4' },
  { label: '5 GHz', value: '5' },
];

const KismetApp = () => {
  const [band, setBand] = useState('all');

  const filteredAps = useMemo(
    () => mockAps.filter((ap) => band === 'all' || ap.band === band),
    [band]
  );

  const channelCounts = useMemo(() => {
    const counts = {};
    filteredAps.forEach((ap) => {
      counts[ap.channel] = (counts[ap.channel] || 0) + 1;
    });
    return counts;
  }, [filteredAps]);

  const maxCount = Math.max(1, ...Object.values(channelCounts));

  const heatList = filteredAps
    .slice()
    .sort((a, b) => b.strength - a.strength);

  return (
    <div className="w-full h-full flex flex-col bg-ub-cool-grey text-white select-none">
      <div className="px-3 py-1 border-b border-gray-700 flex items-center justify-between">
        <span className="font-bold">Kismet</span>
        <div className="space-x-2">
          {bands.map((b) => (
            <button
              key={b.value}
              onClick={() => setBand(b.value)}
              className={`text-xs px-2 py-1 rounded ${
                band === b.value ? 'bg-gray-600' : 'bg-gray-800'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-grow overflow-hidden">
        <div className="w-1/2 p-2 overflow-y-auto">
          <h2 className="text-sm font-semibold mb-2">Heat List</h2>
          {heatList.length ? (
            <ul>
              {heatList.map((ap) => {
                const quality = Math.min(100, Math.max(0, ap.strength + 100));
                return (
                  <li key={ap.ssid} className="mb-3">
                    <div className="flex justify-between text-xs">
                      <span>{ap.ssid}</span>
                      <span className="text-gray-400">{ap.strength} dBm</span>
                    </div>
                    <div className="bg-gray-700 h-2 mt-1">
                      <div
                        className="bg-green-500 h-2"
                        style={{ width: `${quality}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      Ch {ap.channel} • {ap.band} GHz
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-gray-400 text-sm">No access points.</p>
          )}
        </div>
        <div className="w-1/2 p-2 overflow-y-auto border-l border-gray-700 flex flex-col">
          <h2 className="text-sm font-semibold mb-2">Channel Usage</h2>
          <div className="flex-1 flex items-end space-x-1">
            {Object.entries(channelCounts)
              .sort((a, b) => Number(a[0]) - Number(b[0]))
              .map(([ch, count]) => (
                <div key={ch} className="flex flex-col items-center flex-1">
                  <div
                    className="bg-blue-500 w-full"
                    style={{ height: `${(count / maxCount) * 100}%` }}
                  ></div>
                  <span className="text-xs mt-1">{ch}</span>
                </div>
              ))}
          </div>
          <div className="mt-4">
            <h2 className="text-sm font-semibold mb-2">Alerts</h2>
            <ul>
              {mockAlerts.map((a, i) => (
                <li key={i} className="mb-2">
                  <div className="text-red-400 text-xs font-bold">{a.title}</div>
                  <div className="text-xs text-gray-300">{a.explanation}</div>
                </li>
              ))}
            </ul>
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

