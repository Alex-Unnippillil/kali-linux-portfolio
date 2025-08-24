import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import ReactGA from 'react-ga4';
import { Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  ChartData,
} from 'chart.js';

ChartJS.register(LinearScale, PointElement, LineElement, Tooltip, Legend);

interface Result {
  domain: string;
  entropy: number;
  vowelRatio: number;
  ngramScore: number;
  markovScore: number;
  risk: string;
  reasons: string[];
}

const WORDLIST = [
  'alpha',
  'bravo',
  'charlie',
  'delta',
  'echo',
  'foxtrot',
  'golf',
  'hotel',
  'india',
  'juliet',
  'kilo',
  'lima',
  'mike',
  'november',
  'oscar',
  'papa',
  'quebec',
  'romeo',
  'sierra',
  'tango',
  'uniform',
  'victor',
  'whiskey',
  'xray',
  'yankee',
  'zulu',
];

const BASELINE_DOMAINS = [
  'google.com',
  'youtube.com',
  'facebook.com',
  'twitter.com',
  'instagram.com',
  'wikipedia.org',
  'amazon.com',
  'yahoo.com',
  'reddit.com',
  'netflix.com',
];

const NGRAM_THRESHOLD = 0.15;
const MARKOV_THRESHOLD = -3;

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

function buildMarkovModel(domains: string[]) {
  const model: Record<string, Record<string, number>> = {};
  const totals: Record<string, number> = {};
  for (const d of domains) {
    const str = d.toLowerCase().replace(/[^a-z]/g, '');
    for (let i = 0; i < str.length - 1; i++) {
      const a = str[i];
      const b = str[i + 1];
      model[a] = model[a] || {};
      model[a][b] = (model[a][b] || 0) + 1;
      totals[a] = (totals[a] || 0) + 1;
    }
  }
  for (const a of Object.keys(model)) {
    for (const b of Object.keys(model[a])) {
      model[a][b] /= totals[a];
    }
  }
  return model;
}

function markovScore(str: string, model: Record<string, Record<string, number>>): number {
  if (str.length < 2) return 0;
  let score = 0;
  for (let i = 0; i < str.length - 1; i++) {
    const a = str[i];
    const b = str[i + 1];
    const prob = model[a]?.[b] || 1e-6;
    score += Math.log(prob);
  }
  return score / (str.length - 1);
}

function classify(entropy: number, vowel: number, ngram: number, markov: number): {
  risk: string;
  reasons: string[];
} {
  const reasons: string[] = [];
  if (entropy > 4) reasons.push('high entropy');
  if (vowel < 0.3) reasons.push('low vowel ratio');
  if (ngram < NGRAM_THRESHOLD) reasons.push('rare n-grams');
  if (markov < MARKOV_THRESHOLD) reasons.push('low Markov score');
  let risk = 'Low';
  if (reasons.length >= 2) risk = 'High';
  else if (reasons.length === 1) risk = 'Medium';
  return { risk, reasons };
}

export default function DgaDemo() {
  const workerRef = useRef<Worker | null>(null);
  const [mode, setMode] = useState('seed');
  const [algorithm, setAlgorithm] = useState('lcg');
  const [seed, setSeed] = useState(1);
  const [seedInput, setSeedInput] = useState('1');
  const [seedError, setSeedError] = useState('');
  const [length, setLength] = useState(10);
  const [alphabet, setAlphabet] = useState('abcdefghijklmnopqrstuvwxyz');
  const [alphaError, setAlphaError] = useState('');
  const markovModel = useMemo(() => buildMarkovModel(BASELINE_DOMAINS), []);
  const analyzeDomains = useCallback(
    (domains: string[]) =>
      domains.map((domain) => {
        const cleaned = domain.toLowerCase().replace(/[^a-z]/g, '');
        const entropy = shannonEntropy(cleaned);
        const vowel = vowelRatio(cleaned);
        const ngram = ngramScore(cleaned);
        const markov = markovScore(cleaned, markovModel);
        const { risk, reasons } = classify(entropy, vowel, ngram, markov);
        return {
          domain,
          entropy,
          vowelRatio: vowel,
          ngramScore: ngram,
          markovScore: markov,
          risk,
          reasons,
        } as Result;
      }),
    [markovModel]
  );
  const baselineResults = useMemo(
    () => analyzeDomains(BASELINE_DOMAINS),
    [analyzeDomains]
  );
  const [results, setResults] = useState<Result[]>([]);

  const entropyVowelData = useMemo<ChartData<'scatter'>>(
    () => ({
      datasets: [
        {
          label: 'Generated',
          data: results.map((r) => ({ x: r.entropy, y: r.vowelRatio })),
          backgroundColor: 'rgb(255,99,132)',
        } as any,
        {
          label: 'Baseline',
          data: baselineResults.map((r) => ({ x: r.entropy, y: r.vowelRatio })),
          backgroundColor: 'rgb(99,132,255)',
        } as any,
      ],
    }),
    [results, baselineResults]
  );

  const entropyVowelOptions = {
    scales: {
      x: { title: { display: true, text: 'Entropy' } },
      y: {
        title: { display: true, text: 'Vowel Ratio' },
        min: 0,
        max: 1,
      },
    },
  } as const;

  const ngramMarkovData = useMemo<ChartData<'scatter'>>(
    () => ({
      datasets: [
        {
          label: 'Generated',
          data: results.map((r) => ({ x: r.ngramScore, y: r.markovScore })),
          backgroundColor: 'rgb(255,99,132)',
        } as any,
        {
          label: 'Baseline',
          data: baselineResults.map((r) => ({ x: r.ngramScore, y: r.markovScore })),
          backgroundColor: 'rgb(99,132,255)',
        } as any,
        {
          label: 'N-gram threshold',
          data: [
            { x: NGRAM_THRESHOLD, y: -6 },
            { x: NGRAM_THRESHOLD, y: 0 },
          ],
          type: 'line',
          borderColor: 'yellow',
          borderDash: [5, 5],
          pointRadius: 0,
        } as any,
        {
          label: 'Markov threshold',
          data: [
            { x: 0, y: MARKOV_THRESHOLD },
            { x: 1, y: MARKOV_THRESHOLD },
          ],
          type: 'line',
          borderColor: 'orange',
          borderDash: [5, 5],
          pointRadius: 0,
        } as any,
      ],
    }),
    [results, baselineResults]
  );

  const ngramMarkovOptions = {
    scales: {
      x: { title: { display: true, text: 'N-gram score' }, min: 0, max: 1 },
      y: {
        title: { display: true, text: 'Markov score' },
        min: -6,
        max: 0,
      },
    },
  } as const;

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
    if (alphaError) return;
    if (mode === 'seed') {
      if (!workerRef.current || seedError) return;
      workerRef.current.postMessage({
        seed,
        length,
        count: 10,
        alphabet,
        algorithm,
      });
    } else if (mode === 'time') {
      const domains: string[] = [];
      let s = Math.floor(Date.now() / 1000);
      for (let i = 0; i < 10; i++) {
        let name = '';
        for (let j = 0; j < length; j++) {
          s = (1664525 * s + 1013904223) >>> 0;
          name += alphabet[s % alphabet.length];
        }
        domains.push(name + '.com');
      }
      setResults(analyzeDomains(domains));
    } else if (mode === 'wordlist') {
      const domains: string[] = [];
      for (let i = 0; i < 10; i++) {
        const w1 = WORDLIST[Math.floor(Math.random() * WORDLIST.length)];
        const w2 = WORDLIST[Math.floor(Math.random() * WORDLIST.length)];
        domains.push(`${w1}${w2}.com`);
      }
      setResults(analyzeDomains(domains));
    }
    ReactGA.event({
      category: 'Application',
      action: 'Generate domains',
      label: 'DGA Demo',
    });
  }, [mode, seed, length, alphabet, algorithm, seedError, alphaError, analyzeDomains]);

  useEffect(() => {
    workerRef.current = new Worker(
      new URL('./dga-demo.worker.js', import.meta.url)
    );
    workerRef.current.onmessage = (e: MessageEvent<{ domains: string[] }>) => {
      setResults(analyzeDomains(e.data.domains));
    };
    requestDomains();
    return () => workerRef.current?.terminate();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const id = setTimeout(() => {
      requestDomains();
    }, 300);
    return () => clearTimeout(id);
  }, [seed, length, alphabet, algorithm, mode, requestDomains]);

  return (
    <div className="p-4 h-full w-full bg-panel text-white flex flex-col gap-4">
      <div className="flex flex-wrap gap-4 items-end">
        <div>
          <label className="block mb-1">Mode</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="p-1 text-black rounded"
          >
            <option value="seed">Seed</option>
            <option value="time">Time</option>
            <option value="wordlist">Wordlist</option>
          </select>
        </div>
        {mode === 'seed' && (
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
        )}
        {mode !== 'wordlist' && (
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
        )}
        {mode !== 'wordlist' && (
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
        )}
        {mode === 'seed' && (
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
        )}
      </div>
      <div className="flex flex-col md:flex-row gap-4">
        <div className="bg-surface p-2 rounded w-full md:w-1/2">
          <Scatter data={entropyVowelData} options={entropyVowelOptions} />
        </div>
        <div className="bg-surface p-2 rounded w-full md:w-1/2">
          <Scatter data={ngramMarkovData} options={ngramMarkovOptions} />
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
                <th className="p-2">Markov</th>
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
                  <td className="p-2">{r.markovScore.toFixed(2)}</td>
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

