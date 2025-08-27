import React, { useState } from 'react';

const prewrittenLog = (bssid) => [
  'Reaver v1.6.6 - WPS PIN attack simulation',
  `[+] Waiting for beacon from ${bssid || 'AA:BB:CC:DD:EE:FF'}`,
  `[+] Associated with ${bssid || 'AA:BB:CC:DD:EE:FF'}`,
  '[+] Starting session',
  '[+] Trying PIN 12345670',
  '[+] WPS PIN cracked: 12345670',
  '[+] WPA PSK: "password"',
];

export default function ReaverApp() {
  const [bssid, setBssid] = useState('');
  const [pin, setPin] = useState('');
  const [log, setLog] = useState('');
  const [running, setRunning] = useState(false);
  const [ack, setAck] = useState(false);

  const simulateAttack = () => {
    const lines = prewrittenLog(bssid);
    setRunning(true);
    setLog('');
    setPin('');
    let i = 0;
    const interval = setInterval(() => {
      setLog((prev) => `${prev}${lines[i]}\n`);
      i += 1;
      if (i >= lines.length) {
        clearInterval(interval);
        setPin('12345670');
        setRunning(false);
      }
    }, 500);
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <div className="sticky top-0 z-10 mb-4 bg-red-900 p-4 rounded border border-red-700">
        <h3 className="text-lg font-bold mb-2">Legal &amp; Ethical Notice</h3>
        <p className="mb-2 text-sm">
          Unauthorized network attacks are illegal and unethical. This tool
          provides a harmless simulation for educational purposes only.
        </p>
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={ack}
            onChange={(e) => setAck(e.target.checked)}
          />
          <span className="text-sm">I understand and accept the risks.</span>
        </label>
      </div>

      <h2 className="text-lg mb-4">Reaver WPS PIN Attack</h2>

      <div className="mb-4 space-y-4">
        <div className="flex items-center">
          <svg
            className="w-16 h-16 mr-4"
            viewBox="0 0 64 32"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="2" y="6" width="18" height="20" rx="2" />
            <rect x="44" y="6" width="18" height="20" rx="2" />
            <line x1="20" y1="16" x2="44" y2="16" />
            <polygon points="44,16 38,12 38,20" fill="currentColor" />
          </svg>
          <div>
            <div className="font-bold">1. Initiate WPS handshake</div>
            <div className="text-sm">
              The attacker and access point begin the WPS session.
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <svg
            className="w-16 h-16 mr-4"
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <rect x="14" y="28" width="36" height="28" rx="4" />
            <path d="M22 28v-8a10 10 0 0120 0v8" />
            <text
              x="32"
              y="48"
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
            >
              PIN
            </text>
          </svg>
          <div>
            <div className="font-bold">2. Brute-force the PIN</div>
            <div className="text-sm">
              Multiple PIN guesses are sent to the access point.
            </div>
          </div>
        </div>

        <div className="flex items-center">
          <svg
            className="w-16 h-16 mr-4"
            viewBox="0 0 64 64"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="20" cy="32" r="10" />
            <path d="M30 32h20 M40 32v8 M45 32v8" />
          </svg>
          <div>
            <div className="font-bold">3. Retrieve WPA passphrase</div>
            <div className="text-sm">
              The recovered PIN reveals the network&rsquo;s WPA key.
            </div>
          </div>
        </div>
      </div>

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
        onClick={simulateAttack}
        disabled={!ack || running || !bssid}
      >
        Simulate Attempt
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

