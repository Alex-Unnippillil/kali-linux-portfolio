import React, { useState, useEffect } from 'react';
import MD5 from 'crypto-js/md5';
import SHA1 from 'crypto-js/sha1';
import SHA256 from 'crypto-js/sha256';
import bcrypt from 'bcryptjs';

const hashTypes = [
  {
    id: '0',
    name: 'MD5',
    regex: /^[a-f0-9]{32}$/i,
    description: 'Fast but insecure 128-bit hash',
    speed: '10 GH/s',
  },
  {
    id: '100',
    name: 'SHA1',
    regex: /^[a-f0-9]{40}$/i,
    description: '160-bit hash with known weaknesses',
    speed: '3 GH/s',
  },
  {
    id: '1400',
    name: 'SHA256',
    regex: /^[a-f0-9]{64}$/i,
    description: 'Robust 256-bit hash',
    speed: '1 GH/s',
  },
  {
    id: '3200',
    name: 'bcrypt',
    regex: /^\$2[aby]\$.{56}$/,
    description: 'Adaptive hash designed for passwords',
    speed: '50 KH/s',
  },
];

export const detectHashType = (hash) => {
  const type = hashTypes.find((t) => t.regex.test(hash));
  return type ? type.id : hashTypes[0].id;
};

export const generateWordlist = (pattern) => {
  const results = [];
  const max = 1000;
  const helper = (prefix, rest) => {
    if (results.length >= max) return;
    if (!rest.length) {
      results.push(prefix);
      return;
    }
    const ch = rest[0];
    if (ch === '?') {
      for (let i = 0; i < 10 && results.length < max; i++) {
        helper(prefix + i, rest.slice(1));
      }
    } else {
      helper(prefix + ch, rest.slice(1));
    }
  };
  helper('', pattern || '');
  return results;
};

const Gauge = ({ value }) => (
  <div className="w-48">
    <div className="text-sm mb-1">GPU Usage: {value}%</div>
    <div className="w-full h-4 bg-gray-700 rounded">
      <div
        className="h-4 bg-green-500 rounded"
        style={{ width: `${value}%` }}
      />
    </div>
  </div>
);

function HashcatApp() {
  const [hashType, setHashType] = useState(hashTypes[0].id);
  const [hashInput, setHashInput] = useState('');
  const [gpuUsage, setGpuUsage] = useState(0);
  const [benchmark, setBenchmark] = useState('');
  const [pattern, setPattern] = useState('');
  const [wordlistUrl, setWordlistUrl] = useState('');
  const [demoText, setDemoText] = useState('');
  const [demoHash, setDemoHash] = useState('');

  useEffect(() => {
    const interval = setInterval(() => {
      setGpuUsage(Math.floor(Math.random() * 100));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const selectedHashType = hashTypes.find((h) => h.id === hashType);
  const selectedHash = selectedHashType?.name;

  const handleHashChange = (e) => {
    const value = e.target.value.trim();
    setHashInput(value);
    setHashType(detectHashType(value));
  };

  const runBenchmark = () => {
    setBenchmark('Running benchmark...');
    setTimeout(() => {
      const speed = (4000 + Math.random() * 1000).toFixed(0);
      setBenchmark(`GPU0: ${speed} MH/s`);
    }, 500);
  };

  useEffect(() => {
    const hashDemo = () => {
      if (!demoText) {
        setDemoHash('');
        return;
      }
      switch (hashType) {
        case '0':
          setDemoHash(MD5(demoText).toString());
          break;
        case '100':
          setDemoHash(SHA1(demoText).toString());
          break;
        case '1400':
          setDemoHash(SHA256(demoText).toString());
          break;
        case '3200':
          setDemoHash(bcrypt.hashSync(demoText, 8));
          break;
        default:
          setDemoHash('');
      }
    };
    hashDemo();
  }, [demoText, hashType]);

  const createWordlist = () => {
    const list = generateWordlist(pattern);
    const blob = new Blob([list.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    setWordlistUrl(url);
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-4 bg-ub-cool-grey text-white">
      <div>
        <label className="mr-2" htmlFor="hash-input">
          Hash:
        </label>
        <input
          id="hash-input"
          className="text-black px-2 py-1"
          value={hashInput}
          onChange={handleHashChange}
        />
      </div>
      <div>
        <label className="mr-2" htmlFor="hash-type">
          Hash Type:
        </label>
        <select
          id="hash-type"
          className="text-black px-2 py-1"
          value={hashType}
          onChange={(e) => setHashType(e.target.value)}
        >
          {hashTypes.map((h) => (
            <option key={h.id} value={h.id} title={h.description}>
              {h.name}
            </option>
          ))}
        </select>
      </div>
      <div>Detected: {selectedHash}</div>
      {selectedHashType && (
        <div className="text-xs text-gray-300">{selectedHashType.description}</div>
      )}
      <div>
        <label className="mr-2" htmlFor="demo-text">
          Demo Text:
        </label>
        <input
          id="demo-text"
          className="text-black px-2 py-1"
          value={demoText}
          onChange={(e) => setDemoText(e.target.value)}
        />
        {demoHash && (
          <div className="mt-1 text-xs break-all">Hash: {demoHash}</div>
        )}
      </div>
      <button onClick={runBenchmark}>Run Benchmark</button>
      {benchmark && (
        <div data-testid="benchmark-output">{benchmark}</div>
      )}
      <div>
        <label className="mr-2" htmlFor="word-pattern">
          Wordlist Pattern:
        </label>
        <input
          id="word-pattern"
          className="text-black px-2 py-1"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        <button className="ml-2" onClick={createWordlist}>
          Generate
        </button>
      {wordlistUrl && (
          <a
            className="ml-2 underline"
            href={wordlistUrl}
            download="wordlist.txt"
          >
            Download
          </a>
        )}
      </div>
      <Gauge value={gpuUsage} />
      <table className="text-sm mt-4">
        <thead>
          <tr>
            <th className="px-2 border">Algorithm</th>
            <th className="px-2 border">Estimated Speed</th>
          </tr>
        </thead>
        <tbody>
          {hashTypes.map((h) => (
            <tr key={h.id}>
              <td className="px-2 border">{h.name}</td>
              <td className="px-2 border">{h.speed}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-gray-400 mt-2">
        All data is processed in your browser and never stored.
      </p>
    </div>
  );
}

export default HashcatApp;

export const displayHashcat = () => <HashcatApp />;

