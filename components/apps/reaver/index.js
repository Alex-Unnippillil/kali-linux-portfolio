import React, { useState } from 'react';

const checksum = (num) => {
  let acc = 0;
  for (let i = 0; i < 7; i += 1) {
    const digit = num % 10;
    acc += i % 2 === 0 ? digit * 3 : digit;
    num = Math.floor(num / 10);
  }
  return (10 - (acc % 10)) % 10;
};

const derivePin = (bssid) => {
  const mac = bssid.replace(/:/g, '').toUpperCase();
  if (mac.length !== 12) return null;
  const num = parseInt(mac.slice(-6), 16) % 10000000;
  const cs = checksum(num);
  return `${num}`.padStart(7, '0') + cs;
};

export default function ReaverApp() {
  const [bssid, setBssid] = useState('');
  const [pin, setPin] = useState('');
  const [log, setLog] = useState('');
  const [running, setRunning] = useState(false);

  const startAttack = () => {
    setRunning(true);
    setLog(`Starting WPS PIN attack on ${bssid}\n`);
    let tries = 0;
    const interval = setInterval(() => {
      tries += 1;
      const guess = Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, '0');
      setLog((prev) => `${prev}Trying PIN ${guess}\n`);
      if (tries >= 5) {
        clearInterval(interval);
        const result = derivePin(bssid);
        setLog((prev) =>
          `${prev}\nAttack complete. PIN discovered: ${result || 'invalid BSSID'}`
        );
        setPin(result || '');
        setRunning(false);
      }
    }, 500);
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <h2 className="text-lg mb-4">Reaver WPS PIN Attack</h2>
      <div className="mb-2">
        <label className="block mb-1">Target BSSID</label>
        <input
          type="text"
          className="w-full p-2 rounded bg-gray-700 text-white font-mono"
          placeholder="00:11:22:33:44:55"
          value={bssid}
          onChange={(e) => setBssid(e.target.value)}
          disabled={running}
        />
      </div>
      <button
        className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded disabled:opacity-50"
        onClick={startAttack}
        disabled={running || !bssid}
      >
        Start Attack
      </button>
      {pin && (
        <div className="mt-4">
          <div className="mb-1">Discovered WPS PIN:</div>
          <div className="font-mono text-xl">{pin}</div>
        </div>
      )}
      <pre className="mt-4 bg-black text-green-400 p-2 h-48 overflow-y-auto font-mono whitespace-pre-wrap">
        {log}
      </pre>
    </div>
  );
}


export const displayReaver = (addFolder, openApp) => <ReaverApp addFolder={addFolder} openApp={openApp} />;
