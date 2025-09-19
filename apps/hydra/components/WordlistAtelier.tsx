'use client';

import React, { useState } from 'react';

const sampleHashes: Record<string, string> = {
  '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8': 'password',
  '8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92': '123456',
  '1c8bfe8f801d79745c4631d09fff36c82aa37fc4cce4fc946683d7b336b63032': 'letmein',
};

const leetMap: Record<string, string> = {
  a: '4',
  e: '3',
  i: '1',
  o: '0',
  s: '5',
  t: '7',
};

const applyLeet = (word: string): string =>
  word.replace(/[aeiost]/gi, (c) => leetMap[c.toLowerCase()] || c);

async function sha256(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

const WordlistAtelier: React.FC = () => {
  const [baseWords, setBaseWords] = useState('');
  const [upper, setUpper] = useState(false);
  const [leet, setLeet] = useState(false);
  const [digits, setDigits] = useState(false);
  const [generated, setGenerated] = useState<string[]>([]);
  const [matches, setMatches] = useState<string[]>([]);
  const [testing, setTesting] = useState(false);

  const generate = async () => {
    const bases = baseWords
      .split('\n')
      .map((w) => w.trim())
      .filter(Boolean);
    const words = new Set<string>();
    bases.forEach((base) => {
      const variants = [base];
      if (upper) variants.push(base.toUpperCase());
      if (leet) variants.push(applyLeet(base));
      variants.forEach((v) => {
        words.add(v);
        if (digits) {
          for (let i = 0; i <= 9; i++) {
            words.add(v + i);
          }
        }
      });
    });
    const list = Array.from(words);
    setGenerated(list);
    setTesting(true);
    const hits: string[] = [];
    for (const word of list) {
      try {
        const hash = await sha256(word);
        if (sampleHashes[hash]) {
          hits.push(`${word} → ${hash}`);
        }
      } catch (e) {
        // ignore hashing errors
      }
    }
    setMatches(hits);
    setTesting(false);
  };

  const download = () => {
    const blob = new Blob([generated.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'wordlist.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4 p-4 bg-gray-900 text-white">
      <h2 className="text-xl font-bold">Wordlist Atelier</h2>
      <textarea
        className="w-full p-2 rounded text-black"
        rows={4}
        value={baseWords}
        onChange={(e) => setBaseWords(e.target.value)}
        placeholder="One word per line"
        aria-label="Base words"
      />
      <div className="space-x-4">
        <label>
          <input
            type="checkbox"
            checked={upper}
            onChange={(e) => setUpper(e.target.checked)}
            className="mr-1"
            aria-label="Toggle uppercase"
          />
          Uppercase
        </label>
        <label>
          <input
            type="checkbox"
            checked={leet}
            onChange={(e) => setLeet(e.target.checked)}
            className="mr-1"
            aria-label="Toggle leet substitutions"
          />
          Leet
        </label>
        <label>
          <input
            type="checkbox"
            checked={digits}
            onChange={(e) => setDigits(e.target.checked)}
            className="mr-1"
            aria-label="Toggle append digits"
          />
          Append 0-9
        </label>
      </div>
      <button
        onClick={generate}
        className="px-4 py-2 bg-green-600 rounded"
      >
        Generate
      </button>
      {generated.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center space-x-4">
            <p className="text-sm">Generated {generated.length} words</p>
            <button
              onClick={download}
              className="px-3 py-1 bg-blue-600 rounded"
            >
              Download
            </button>
          </div>
          {testing ? (
            <p className="text-sm">Testing hashes...</p>
          ) : matches.length > 0 ? (
            <div>
              <p className="text-sm">Matches:</p>
              <ul className="list-disc list-inside text-sm">
                {matches.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm">No matches found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default WordlistAtelier;

