'use client';

import React, { useEffect, useRef, useState } from 'react';
import LegalInterstitial from '../../components/ui/LegalInterstitial';
import TabbedWindow, { TabDefinition } from '../../components/ui/TabbedWindow';
import WpsMath from './components/WpsMath';

interface RouterMeta {
  model: string;
  notes: string;
}

const stages = [
  {
    title: 'Discovery',
    detail:
      'Scanning for WPS-enabled access points. Retries with incremental backoff when none are found.',
  },
  {
    title: 'Association',
    detail:
      'Associates with the target AP. Failed attempts are retried with exponential backoff.',
  },
  {
    title: 'Handshake (M1–M8)',
    detail:
      'Exchanges WPS messages. NACK responses trigger delays before retrying.',
  },
  {
    title: 'PIN Brute Force',
    detail:
      'Cycles through possible PINs. Routers may lock WPS or impose delays after repeated failures.',
  },
];

const TOTAL_PINS = 11000; // example PIN space for demonstration

const formatTime = (seconds: number) => {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return [hrs, mins, secs]
    .map((v) => String(v).padStart(2, '0'))
    .join(':');
};

const ReaverPanel: React.FC = () => {
  const [routers, setRouters] = useState<RouterMeta[]>([]);
  const [routerIdx, setRouterIdx] = useState(0);
  const [rate, setRate] = useState(1);
  const [attempts, setAttempts] = useState(0);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    fetch('/demo-data/reaver/routers.json')
      .then((r) => r.json())
      .then(setRouters)
      .catch(() => setRouters([]));
  }, []);

  useEffect(() => {
    if (!running) return;
    intervalRef.current = setInterval(() => {
      setAttempts((prev) => {
        const next = prev + rate;
        if (next >= TOTAL_PINS) {
          clearInterval(intervalRef.current!);
          return TOTAL_PINS;
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [running, rate]);

  const start = () => {
    setAttempts(0);
    setRunning(true);
  };

  const stop = () => {
    setRunning(false);
    clearInterval(intervalRef.current!);
  };

  const timeRemaining = (TOTAL_PINS - attempts) / rate;

  return (
    <div className="p-4 bg-gray-900 text-white h-full overflow-y-auto">
      <h1 className="text-2xl mb-4">Reaver WPS Simulator</h1>
      <p className="text-sm text-yellow-300 mb-4">
        Educational simulation. No real Wi-Fi traffic is generated.
      </p>

      <div className="mb-6">
        <h2 className="text-lg mb-2">Attack Stages</h2>
        <ol className="list-decimal list-inside space-y-2 text-sm">
          {stages.map((s) => (
            <li key={s.title}>
              <span className="font-semibold">{s.title}:</span> {s.detail}
            </li>
          ))}
        </ol>
      </div>

      <div className="mb-6">
        <h2 className="text-lg mb-2">PIN Brute-force Simulator</h2>
        <div className="flex items-center gap-2 mb-2">
          <label htmlFor="rate" className="text-sm">
            Attempts/sec
          </label>
          <input
            id="rate"
            type="number"
            min="1"
            value={rate}
            onChange={(e) => setRate(Number(e.target.value) || 1)}
            className="w-20 p-1 bg-gray-800 rounded text-white"
          />
          <button
            type="button"
            onClick={running ? stop : start}
            className="px-2 py-1 bg-green-700 rounded disabled:opacity-50"
          >
            {running ? 'Stop' : 'Start'}
          </button>
        </div>
        <div className="text-sm mb-1">
          Attempts: {attempts} / {TOTAL_PINS}
        </div>
        <div className="w-full bg-gray-700 h-2 mb-1" aria-hidden="true">
          <div
            className="bg-green-500 h-2"
            style={{ width: `${(attempts / TOTAL_PINS) * 100}%` }}
          />
        </div>
        <div className="text-sm">
          Est. time remaining: {formatTime(timeRemaining)}
        </div>
      </div>

      <div className="mb-6">
        <h2 className="text-lg mb-2">WPS PIN Math</h2>
        <WpsMath />
      </div>

      <div>
        <h2 className="text-lg mb-2">Router Metadata</h2>
        {routers.length > 0 ? (
          <>
            <select
              className="mb-2 p-2 rounded bg-gray-800 text-white"
              value={routerIdx}
              onChange={(e) => setRouterIdx(Number(e.target.value))}
            >
              {routers.map((r, i) => (
                <option key={r.model} value={i}>
                  {r.model}
                </option>
              ))}
            </select>
            <p className="text-sm">{routers[routerIdx]?.notes}</p>
          </>
        ) : (
          <p className="text-sm">No router metadata loaded.</p>
        )}
      </div>
    </div>
  );
};

const ReaverApp: React.FC = () => {
  return <ReaverPanel />;
};

const ReaverPage: React.FC = () => {
  const [accepted, setAccepted] = useState(false);
  const countRef = useRef(1);

  if (!accepted) {
    return <LegalInterstitial onAccept={() => setAccepted(true)} />;
  }

  const createTab = (): TabDefinition => {
    const id = Date.now().toString();
    return { id, title: `Session ${countRef.current++}`, content: <ReaverApp /> };
  };

  return (
    <TabbedWindow
      className="min-h-screen bg-gray-900 text-white"
      initialTabs={[createTab()]}
      onNewTab={createTab}
    />
  );
};

export default ReaverPage;

