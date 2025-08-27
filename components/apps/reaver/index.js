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

function ProgressRing({ progress, prefersReduced }) {
  const radius = 24;
  const stroke = 4;
  const normalizedRadius = radius - stroke * 2;
  const circumference = normalizedRadius * 2 * Math.PI;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg
      height={radius * 2}
      width={radius * 2}
      className="text-green-400"
      role="progressbar"
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
          transition: prefersReduced ? 'none' : 'stroke-dashoffset 0.2s linear',
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
  const rafRef = useRef();

  const steps = [
    'Initializing',
    'Associating',
    'Sending M1',
    'Receiving M2',
    'Deriving PIN',
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
        }`
    );
    setRunning(false);
  };

  const startAttack = () => {
    setRunning(true);
    setStatus(null);
    setPin('');
    setLog(`Starting WPS handshake with ${bssid}\n`);
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
      {running && (
        <div className="mt-4 flex items-center space-x-4">
          <ProgressRing progress={progress} prefersReduced={prefersReduced} />
          <div aria-live="polite" className="text-sm">
            {steps[step]}
          </div>
        </div>
      )}
      {status && (
        <div
          className={`mt-4 text-sm ${
            status === 'success' ? 'text-green-400' : 'text-red-400'
          }`}
          aria-live="polite"
        >
          {status === 'success'
            ? `Handshake complete. PIN discovered: ${pin}`
            : 'Handshake failed. Invalid BSSID.'}
        </div>
      )}
      <pre className="mt-4 bg-black text-green-400 p-2 h-48 overflow-y-auto font-mono whitespace-pre-wrap">
        {log}
      </pre>
    </div>
  );
}

