'use client';

import React, { useEffect, useRef, useState } from 'react';

interface RuleSets {
  [key: string]: string[];
}

const attackModes = [
  { value: '0', label: 'Straight' },
  { value: '3', label: 'Brute-force' },
  { value: '6', label: 'Hybrid Wordlist + Mask' },
  { value: '7', label: 'Hybrid Mask + Wordlist' },
];

const ruleSets: RuleSets = {
  none: [],
  best64: ['c', 'u', 'l', 'r', 'd', 'p', 't', 's'],
  quick: ['l', 'u', 'c', 'd'],
};

const Hashcat: React.FC = () => {
  const [attackMode, setAttackMode] = useState('0');
  const [mask, setMask] = useState('');
  const appendMask = (token: string) => setMask((m) => m + token);

  const [hashSample, setHashSample] = useState('');
  const [hashType, setHashType] = useState('Unknown');

  useEffect(() => {
    const hex = /^[a-f0-9]+$/i;
    if (hex.test(hashSample)) {
      if (hashSample.length === 32) setHashType('MD5');
      else if (hashSample.length === 40) setHashType('SHA1');
      else if (hashSample.length === 64) setHashType('SHA256');
      else setHashType('Unknown');
    } else {
      setHashType('Unknown');
    }
  }, [hashSample]);

  const [ruleSet, setRuleSet] = useState('none');
  const rulePreview = (ruleSets[ruleSet] || []).slice(0, 10).join('\n');

  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [eta, setEta] = useState('00:00');
  const [recovered, setRecovered] = useState(0);
  const total = 1;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopInterval = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const start = () => {
    setRunning(true);
    setProgress(0);
    setRecovered(0);
    setEta('00:00');
    stopInterval();
    intervalRef.current = setInterval(() => {
      setProgress((prev) => {
        const next = Math.min(prev + Math.random() * 5, 100);
        const remaining = (100 - next) * 0.6; // total ~60s
        const mins = Math.floor(remaining / 60);
        const secs = Math.floor(remaining % 60);
        setEta(`${mins.toString().padStart(2, '0')}:${secs
          .toString()
          .padStart(2, '0')}`);
        setSpeed(1000 + Math.random() * 500);
        if (next >= 100) {
          setRecovered(total);
          setRunning(false);
          stopInterval();
        }
        return next;
      });
    }, 500);
  };

  const stop = () => {
    setRunning(false);
    stopInterval();
  };

  useEffect(() => () => stopInterval(), []);

  const showMask = attackMode === '3' || attackMode === '6' || attackMode === '7';

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-4">
      <h1 className="text-2xl">Hashcat Simulator</h1>

      <div>
        <label className="block mb-1">Attack Mode</label>
        <select
          value={attackMode}
          onChange={(e) => setAttackMode(e.target.value)}
          className="text-black p-1 rounded"
        >
          {attackModes.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {showMask && (
        <div>
          <label className="block mb-1">Mask</label>
          <input
            type="text"
            value={mask}
            onChange={(e) => setMask(e.target.value)}
            className="text-black p-1 w-full font-mono mb-2"
          />
          <div className="space-x-2">
            {['?l', '?u', '?d', '?s', '?a'].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => appendMask(t)}
                className="px-2 py-1 bg-blue-600 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-blue-500"
              >
                {t}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block mb-1">Hash Sample</label>
        <input
          type="text"
          value={hashSample}
          onChange={(e) => setHashSample(e.target.value)}
          className="text-black p-1 w-full font-mono"
          placeholder="Paste hash here"
        />
        <div className="mt-1 text-sm">Detected: {hashType}</div>
      </div>

      <div>
        <label className="block mb-1">Rule Set</label>
        <select
          value={ruleSet}
          onChange={(e) => setRuleSet(e.target.value)}
          className="text-black p-1 rounded"
        >
          <option value="none">None</option>
          <option value="best64">best64</option>
          <option value="quick">quick</option>
        </select>
        <pre className="bg-black text-green-400 p-2 mt-2 rounded overflow-auto h-32 font-mono leading-[1.2]">
          {rulePreview || '(no rules)'}
        </pre>
      </div>

      <div>
        <button
          type="button"
          onClick={running ? stop : start}
          className="px-4 py-2 bg-green-600 rounded focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-500"
        >
          {running ? 'Stop' : 'Start'}
        </button>
      </div>

      <div>
        <div className="h-2 bg-gray-700 rounded">
          <div
            className="h-full bg-green-500 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 text-sm">
          Speed: {speed.toFixed(0)} H/s | ETA: {eta} | Recovered: {recovered}/{total}
        </div>
      </div>
    </div>
  );
};

export default Hashcat;

