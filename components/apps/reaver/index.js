import React, { useEffect, useState, useRef } from 'react';

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

function ProgressRing({ progress, prefersReduced, status }) {
  const radius = 24;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  const color =
    status === 'failure'
      ? 'text-red-400'
      : status === 'success'
      ? 'text-green-400'
      : 'text-green-400';

  return (
    <svg
      height={radius * 2}
      width={radius * 2}
      className={color}
      role="progressbar"
      aria-label="Handshake progress"
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={Math.round(progress)}
    >
      <circle
        stroke="currentColor"
        fill="transparent"
        strokeWidth={stroke}
        strokeDasharray={`${circumference} ${circumference}`}
        style={{
          strokeDashoffset,
          transition: prefersReduced
            ? 'none'
            : 'stroke-dashoffset 0.2s linear',
        }}
        r={normalizedRadius}
        cx={radius}
        cy={radius}
      />
    </svg>
  );
}

export default function ReaverApp() {
  const [bssid, setBssid] = useState('');
  const [pin, setPin] = useState('');
  const [log, setLog] = useState('');
  const [running, setRunning] = useState(false);
  const [step, setStep] = useState(-1);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState(null); // success | failure
  const [prefersReduced, setPrefersReduced] = useState(false);
  const [ack, setAck] = useState(false);
  const rafRef = useRef();

  const steps = [
    'S1: Initializing',
    'S2: Scanning',
    'S3: Associating',
    'S4: Sending M1',
    'S5: Receiving M2',
    'S6: Sending M3',
    'S7: Receiving M4',
    'S8: Deriving PIN',
  ];

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefersReduced(media.matches);
    handler();
    media.addEventListener('change', handler);
    return () => media.removeEventListener('change', handler);
  }, []);

  const finalize = () => {
    const result = derivePin(bssid);
    setStatus(result ? 'success' : 'failure');
    setPin(result || '');
    setLog(
      (prev) =>
        `${prev}\nHandshake ${result ? 'complete' : 'failed'}${
          result ? ` PIN: ${result}` : ''
        }\nSimulation only – no live Wi-Fi attacks occurred.`
    );
    setRunning(false);
  };

  const startAttack = () => {
    setRunning(true);
    setStatus(null);
    setPin('');
    setLog(
      `Starting simulated WPS handshake with ${bssid}\n` +
        'No live Wi-Fi attacks occur.\n'
    );
    const start = performance.now();
    const stepDuration = 1000;
    const totalTime = steps.length * stepDuration;

    const update = (now) => {
      const elapsed = now - start;
      const current = Math.min(
        Math.floor(elapsed / stepDuration),
        steps.length - 1
      );
      if (current !== step) {
        setStep(current);
        setLog((prev) => `${prev}${steps[current]}...\n`);
      }
      setProgress(Math.min((elapsed / totalTime) * 100, 100));
      if (elapsed < totalTime) {
        rafRef.current = requestAnimationFrame(update);
      } else {
        finalize();
      }
    };

    if (prefersReduced) {
      steps.forEach((s, i) => {
        setTimeout(() => {
          setStep(i);
          setProgress(((i + 1) / steps.length) * 100);
          setLog((prev) => `${prev}${s}...\n`);
          if (i === steps.length - 1) finalize();
        }, i * 50);
      });
    } else {
      rafRef.current = requestAnimationFrame(update);
    }
  };

  useEffect(() => () => cancelAnimationFrame(rafRef.current), []);

  if (!ack) {
    return (
      <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
        <h2 className="text-lg mb-2">Reaver WPS PIN Attack</h2>
        <p className="text-yellow-300 text-sm mb-4">
          For lab use only. Simulation only — no live tests are performed.
        </p>
        <button
          onClick={() => setAck(true)}
          className="px-4 py-2 bg-ub-green text-black rounded"
        >
          I understand
        </button>
      </div>
    );
  }

  return (
    <div className="h-full w-full p-4 bg-ub-cool-grey text-white overflow-auto">
      <h2 className="text-lg">Reaver WPS PIN Attack</h2>
      <p className="text-xs text-gray-300 mb-4">
        Simulation only—no live Wi-Fi attacks occur.
      </p>
      <div className="mb-4 bg-black p-2 text-sm">
        <h3 className="font-bold mb-1">About WPS</h3>
        <p>
          Wi-Fi Protected Setup (WPS) simplifies network configuration but its
          PIN method is vulnerable to brute-force attacks, potentially exposing
          WPA/WPA2 keys.
        </p>
        <p className="mt-2">
          Tools like Reaver exploit this weakness. Use only in isolated lab
          environments with authorization.
        </p>
        <p className="mt-2">
          This simulator references the{' '}
          <a
            href="https://github.com/t6x/reaver-wps-fork-t6x"
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-ub-green"
          >
            maintained reaver-wps-fork
          </a>
          . No live tests are performed.
        </p>
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
        onClick={startAttack}
        disabled={running || !bssid}
      >
        Start Simulation
      </button>
      {running && (
        <div className="mt-4 flex items-center space-x-4">
          <ProgressRing
            progress={progress}
            prefersReduced={prefersReduced}
            status={status}
          />
          <div aria-live="polite" className="text-sm">
            {steps[step]}
          </div>
        </div>
      )}
      {status && (
        <div
          className={`mt-4 text-sm ${
            status === 'success' ? 'text-green-300' : 'text-red-300'
          }`}
          aria-live="assertive"
        >
          {status === 'success'
            ? `Handshake complete. PIN discovered: ${pin}`
            : 'Handshake failed. Invalid BSSID.'}
        </div>
      )}
      <pre
        className="mt-4 bg-black text-green-400 p-2 h-48 overflow-y-auto font-mono whitespace-pre-wrap"
      >
        {log}
      </pre>
    </div>
  );
}

