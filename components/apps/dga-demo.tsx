import React, { useState } from 'react';
import ReactGA from 'react-ga4';

interface Result {
  domain: string;
  entropy: number;
  vowelRatio: number;
  ngramScore: number;
  risk: string;
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

function riskLabel(entropy: number, vowel: number, ngram: number): string {
  let score = 0;
  if (entropy > 4) score++;
  if (vowel < 0.3) score++;
  if (ngram < 0.15) score++;
  if (score >= 2) return 'High';
  if (score === 1) return 'Medium';
  return 'Low';
}

export default function DgaDemo() {
  const [input, setInput] = useState(
    'google.com\n3r45gdfg.com\nfacebook.com\nxlkj23sd.biz'
  );
  const [results, setResults] = useState<Result[]>([]);

  const analyze = () => {
    const domains = input.split(/\s+/).filter(Boolean);
    const res = domains.map((domain) => {
      const cleaned = domain.toLowerCase().replace(/[^a-z]/g, '');
      const entropy = shannonEntropy(cleaned);
      const vowel = vowelRatio(cleaned);
      const ngram = ngramScore(cleaned);
      const risk = riskLabel(entropy, vowel, ngram);
      return { domain, entropy, vowelRatio: vowel, ngramScore: ngram, risk };
    });
    setResults(res);
    ReactGA.event({
      category: 'Application',
      action: 'Analyze domains',
      label: 'DGA Demo',
    });
  };

  return (
    <div className="p-4 h-full w-full bg-panel text-white flex flex-col">
      <textarea
        className="w-full h-32 p-2 text-black rounded"
        value={input}
        onChange={(e) => setInput(e.target.value)}
      />
      <button
        className="mt-2 self-start bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
        onClick={analyze}
      >
        Analyze
      </button>
      {results.length > 0 && (
        <div className="mt-4 overflow-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left">
                <th className="p-2">Domain</th>
                <th className="p-2">Entropy</th>
                <th className="p-2">Vowel Ratio</th>
                <th className="p-2">N-gram</th>
                <th className="p-2">Risk</th>
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

