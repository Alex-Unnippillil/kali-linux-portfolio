import React, { useState } from 'react';
import {
  identifyHashType,
  getSampleCrack,
  estimateCrackTime,
} from './utils';

const WORDLISTS = ['rockyou.txt', 'top100.txt', 'custom.txt'];

const JohnApp = () => {
  const [hashes, setHashes] = useState('');
  const [hashTypes, setHashTypes] = useState([]);
  const [wordlist, setWordlist] = useState(WORDLISTS[0]);
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');

  const updateHashes = (value) => {
    setHashes(value);
    const arr = value.split(/\r?\n/).filter(Boolean);
    setHashTypes(arr.map((h) => identifyHashType(h)));
  };

  const handleHashesChange = (e) => {
    updateHashes(e.target.value);
  };

  const handleHashPaste = (e) => {
    const text = e.clipboardData.getData('text');
    e.preventDefault();
    updateHashes(text);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const hashArr = hashes.split(/\r?\n/).filter(Boolean);
    if (!hashArr.length) {
      setError('At least one hash is required');
      return;
    }
    setError('');
    const results = hashArr.map((h, i) => {
      const type = identifyHashType(h);
      const cracked = getSampleCrack(type);
      const time = estimateCrackTime(type, wordlist);
      return `Hash ${i + 1} (${type}): ${cracked} (est. ${time})`;
    });
    setOutput(
      `Simulation only. No real cracking performed.\n\n${results.join('\n')}`
    );
  };

  return (
    <div className="h-full w-full flex flex-col bg-ub-cool-grey text-white">
      <form onSubmit={handleSubmit} className="p-4 flex flex-col gap-2">
        <p className="text-xs text-gray-400">
          This is a demonstration; no actual cracking occurs.
        </p>
        <label htmlFor="john-hashes" className="text-sm">
          Hashes (one per line)
        </label>
        <textarea
          id="john-hashes"
          value={hashes}
          onChange={handleHashesChange}
          onPaste={handleHashPaste}
          placeholder="Enter or paste hashes"
          className="flex-1 px-2 py-1 bg-gray-800 text-white rounded h-24"
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={error ? 'john-error' : undefined}
        />
        {hashTypes.length > 0 && (
          <ul className="text-xs text-gray-300">
            {hashTypes.map((t, i) => (
              <li key={i}>{`Hash ${i + 1}: ${t}`}</li>
            ))}
          </ul>
        )}
        <label htmlFor="john-wordlist" className="text-sm">
          Wordlist
        </label>
        <select
          id="john-wordlist"
          value={wordlist}
          onChange={(e) => setWordlist(e.target.value)}
          className="px-2 py-1 bg-gray-800 text-white rounded"
        >
          {WORDLISTS.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="px-4 py-1 bg-gray-700 hover:bg-gray-600 rounded self-start"
        >
          Crack
        </button>
        {error && (
          <p id="john-error" role="alert" className="text-red-500 text-sm">
            {error}
          </p>
        )}
      </form>
      <pre className="flex-1 overflow-auto p-4 whitespace-pre-wrap">{output}</pre>
    </div>
  );
};

export default JohnApp;

export const displayJohn = (addFolder, openApp) => (
  <JohnApp addFolder={addFolder} openApp={openApp} />
);
