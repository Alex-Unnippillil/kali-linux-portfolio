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

export const buildReaverCommand = ({ iface, bssid, channel, verbose, extra } = {}) => {
  const parts = ['reaver'];
  if (iface) parts.push('-i', iface);
  if (bssid) parts.push('-b', bssid);
  if (channel) parts.push('-c', channel);
  if (verbose) parts.push('-vv');
  if (extra) parts.push(extra);
  return parts.join(' ');
};

export const detectLockout = (attempts, threshold = 3) => {
  if (attempts.length < threshold) return false;
  const recent = attempts.slice(-threshold);
  return recent.every((a) => a.success === false);
};

export default function ReaverApp() {
  const [bssid, setBssid] = useState('');
  const [iface, setIface] = useState('');
  const [channel, setChannel] = useState('');
  const [extra, setExtra] = useState('');
  const [verbose, setVerbose] = useState(true);
  const [command, setCommand] = useState('');
  const [pin, setPin] = useState('');
  const [log, setLog] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [lockout, setLockout] = useState(false);
  const [running, setRunning] = useState(false);

  const startAttack = () => {
    setRunning(true);
    setLog([{ time: new Date(), message: `Starting WPS PIN attack on ${bssid}` }]);
    setAttempts([]);
    setLockout(false);
    let tries = 0;
    const interval = setInterval(() => {
      tries += 1;
      const guess = Math.floor(Math.random() * 1e8)
        .toString()
        .padStart(8, '0');
      setLog((prev) => [...prev, { time: new Date(), message: `Trying PIN ${guess}` }]);
      setAttempts((prev) => {
        const next = [...prev, { success: false }];
        if (detectLockout(next)) {
          setLockout(true);
          setLog((prevLog) => [
            ...prevLog,
            { time: new Date(), message: 'Warning: possible WPS lockout detected' },
          ]);
        }
        return next;
      });
      if (tries >= 5) {
        clearInterval(interval);
        const result = derivePin(bssid);
        setLog((prev) => [
          ...prev,
          { time: new Date(), message: `Attack complete. PIN discovered: ${result || 'invalid BSSID'}` },
        ]);
        setPin(result || '');
        setAttempts((prev) => [...prev, { success: !!result }]);
        setRunning(false);
      }
    }, 500);
  };

  const buildCmd = () => {
    const cmd = buildReaverCommand({ iface, bssid, channel, verbose, extra });
    setCommand(cmd);
  };

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <h2 className="text-lg mb-4">Reaver WPS PIN Attack</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4">
        <div>
          <label className="block mb-1">Interface</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-gray-700 text-white font-mono"
            placeholder="wlan0"
            value={iface}
            onChange={(e) => setIface(e.target.value)}
            disabled={running}
          />
        </div>
        <div>
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
        <div>
          <label className="block mb-1">Channel</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-gray-700 text-white font-mono"
            placeholder="6"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            disabled={running}
          />
        </div>
        <div>
          <label className="block mb-1">Extra Options</label>
          <input
            type="text"
            className="w-full p-2 rounded bg-gray-700 text-white font-mono"
            placeholder="-L"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            disabled={running}
          />
        </div>
        <div className="flex items-center">
          <input
            id="reaver-verbose"
            type="checkbox"
            className="mr-2"
            checked={verbose}
            onChange={(e) => setVerbose(e.target.checked)}
            disabled={running}
          />
          <label htmlFor="reaver-verbose">Verbose</label>
        </div>
      </div>
      <div className="mb-4 flex flex-col sm:flex-row gap-2">
        <button
          className="px-4 py-2 bg-blue-700 hover:bg-blue-600 rounded disabled:opacity-50"
          onClick={buildCmd}
          disabled={!bssid}
        >
          Build Command
        </button>
        <button
          className="px-4 py-2 bg-green-700 hover:bg-green-600 rounded disabled:opacity-50"
          onClick={startAttack}
          disabled={running || !bssid}
        >
          Start Attack
        </button>
      </div>
      {command && (
        <pre className="mb-4 bg-black text-green-400 p-2 overflow-x-auto whitespace-pre-wrap">
          {command}
        </pre>
      )}
      {pin && (
        <div className="mb-4">
          <div className="mb-1">Discovered WPS PIN:</div>
          <div className="font-mono text-xl">{pin}</div>
        </div>
      )}
      {lockout && (
        <div className="mb-2 text-yellow-300">
          Warning: WPS may be locked due to repeated failed attempts
        </div>
      )}
      <pre className="bg-black text-green-400 p-2 h-48 overflow-y-auto font-mono whitespace-pre-wrap">
        {log.map((entry) => {
          const time = entry.time.toLocaleTimeString();
          return `[${time}] ${entry.message}\n`;
        })}
      </pre>
    </div>
  );
}

export { derivePin };

