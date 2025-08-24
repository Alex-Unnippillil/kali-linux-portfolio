import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import ReactGA from 'react-ga4';

interface Result {
  domain: string;
  entropy: number;
  vowelRatio: number;
  ngramScore: number;
  risk: string;
  reasons: string[];
}

const COMMON_BIGRAMS = new Set([
  'th',
  'he',
  'in',
  'er',
  'an',
  're',
  'on',
  'at',
  'en',
  'nd',
  'ti',
  'es',
  'or',
  'te',
  'of',
  'ed',
  'is',
  'it',
  'al',
  'ar',
  'st',
  'to',
  'nt',
  'ng',
  'se',
  'ha',
  'as',
  'ou',
  'io',
  'le',
  've',
  'co',
  'me',
  'de',
  'hi',
  'ri',
  'ro',
  'ic',
  'ne',
]);

function shannonEntropy(str: string): number {
  const len = str.length;
  if (!len) return 0;
  const freq: Record<string, number> = {};
  for (const c of str) {
    freq[c] = (freq[c] || 0) + 1;
  }
  return Object.values(freq).reduce((acc, f) => {
    const p = f / len;
    return acc - p * Math.log2(p);
  }, 0);
}

function vowelRatio(str: string): number {
  if (!str.length) return 0;
  const vowels = str.match(/[aeiou]/g)?.length || 0;
  return vowels / str.length;
}

function ngramScore(str: string): number {
  if (str.length < 2) return 0;
  let hits = 0;
  for (let i = 0; i < str.length - 1; i++) {
    const gram = str.slice(i, i + 2);
    if (COMMON_BIGRAMS.has(gram)) hits++;
  }
  return hits / (str.length - 1);
}

function classify(entropy: number, vowel: number, ngram: number): {
  risk: string;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (entropy > 4) reasons.push('high entropy');
  if (vowel < 0.3) reasons.push('low vowel ratio');
  if (ngram < 0.15) reasons.push('rare n-grams');
  let risk = 'Low';
  if (reasons.length >= 2) risk = 'High';
  else if (reasons.length === 1) risk = 'Medium';
  return { risk, reasons };
}

export default function DgaDemo() {
  const workerRef = useRef<Worker | null>(null);
  const [algorithm, setAlgorithm] = useState('lcg');
  const [seed, setSeed] = useState(1);
  const [seedInput, setSeedInput] = useState('1');
  const [seedError, setSeedError] = useState('');
  const [length, setLength] = useState(10);
  const [alphabet, setAlphabet] = useState('abcdefghijklmnopqrstuvwxyz');
  const [alphaError, setAlphaError] = useState('');
  const [results, setResults] = useState<Result[]>([]);

  const validateSeed = useCallback(
    (val: string) => {
      if (!/^-?\d+$/.test(val)) {
        setSeedError('Seed must be an integer');
        return;
      }
      const num = parseInt(val, 10);
      if (num < 0 || num > 1000000) {
        setSeedError('Seed must be between 0 and 1,000,000');
        return;
      }
      setSeedError('');
      setSeed(num);
    },
    [setSeed]
  );

  const validateAlphabet = useCallback((val: string) => {
    if (!/^[a-z]+$/.test(val)) {
      setAlphaError('Alphabet must be lowercase letters');
      return false;
    }
    if (val.length < 2) {
      setAlphaError('Alphabet must be at least 2 characters');
      return false;
    }
    setAlphaError('');
    return true;
  }, []);

  const requestDomains = useCallback(() => {
    if (!workerRef.current || seedError || alphaError) return;
    workerRef.current.postMessage({
      seed,
      length,
      count: 10,
      alphabet,
      algorithm,
    });
    ReactGA.event({
      category: 'Application',
      action: 'Generate domains',
      label: 'DGA Demo',
    });
  }, [seed, length, alphabet, algorithm, seedError, alphaError]);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./dga-demo.worker.js', import.meta.url)
    );
    workerRef.current.onmessage = (e: MessageEvent<{ domains: string[] }>) => {
      const res = e.data.domains.map((domain) => {
        const cleaned = domain.toLowerCase().replace(/[^a-z]/g, '');
        const entropy = shannonEntropy(cleaned);
        const vowel = vowelRatio(cleaned);
        const ngram = ngramScore(cleaned);
        const { risk, reasons } = classify(entropy, vowel, ngram);
        return {
          domain,
          entropy,
          vowelRatio: vowel,
          ngramScore: ngram,
          risk,
          reasons,
        } as Result;
      });
      setResults(res);
    };
    requestDomains();
    return () => workerRef.current?.terminate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setTimeout(() => {
      requestDomains();
    }, 300);
    return () => clearTimeout(id);
  }, [seed, length, alphabet, algorithm, requestDomains]);

  return (
    <div className="p-4 h-full w-full bg-panel text-white flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block mb-1">Seed</label>
          <input
            type="text"
            value={seedInput}
            onChange={(e) => {
              setSeedInput(e.target.value);
              validateSeed(e.target.value);
            }}
            className="w-24 p-1 text-black rounded"
          />
          <input
            type="range"
            min={0}
            max={1000000}
            value={seed}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              setSeed(val);
              setSeedInput(e.target.value);
              setSeedError('');
            }}
          />
          {seedError && (
            <p className="text-red-400 text-sm mt-1">{seedError}</p>
          )}
        </div>
        <div>
          <label className="block mb-1">Length ({length})</label>
          <input
            type="range"
            min={4}
            max={32}
            value={length}
            onChange={(e) => setLength(parseInt(e.target.value, 10))}
          />
        </div>
        <div>
          <label className="block mb-1">Alphabet</label>
          <input
            type="text"
            value={alphabet}
            onChange={(e) => {
              setAlphabet(e.target.value);
              validateAlphabet(e.target.value);
            }}
            className="p-1 text-black rounded"
          />
          {alphaError && (
            <p className="text-red-400 text-sm mt-1">{alphaError}</p>
          )}
        </div>
        <div>
          <label className="block mb-1">Algorithm</label>
          <select
            value={algorithm}
            onChange={(e) => setAlgorithm(e.target.value)}
            className="p-1 text-black rounded"
          >
            <option value="lcg">LCG</option>
            <option value="xorshift">XORShift</option>
          </select>
        </div>
      </div>

      {results.length > 0 && (
        <div className="overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Domain</th>
                <th className="p-2">Entropy</th>
                <th className="p-2">Vowel Ratio</th>
                <th className="p-2">N-gram</th>
                <th className="p-2">Risk</th>
                <th className="p-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r) => (
                <tr key={r.domain} className="odd:bg-surface odd:bg-opacity-20">
                  <td className="p-2">{r.domain}</td>
                  <td className="p-2">{r.entropy.toFixed(2)}</td>
                  <td className="p-2">{r.vowelRatio.toFixed(2)}</td>
                  <td className="p-2">{r.ngramScore.toFixed(2)}</td>
                  <td className="p-2 font-semibold">
                    <span
                      className={
                        r.risk === 'High'
                          ? 'text-red-500'
                          : r.risk === 'Medium'
                          ? 'text-yellow-400'
                          : 'text-green-400'
                      }
                    >
                      {r.risk}
                    </span>
                  </td>
                  <td className="p-2">{r.reasons.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export const displayDgaDemo = () => <DgaDemo />;

