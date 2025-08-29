import React, { useState, useEffect } from 'react';

const algorithms = ['SHA-1', 'SHA-256', 'SHA-384', 'SHA-512'];

const HashConverter = () => {
  const [text, setText] = useState('');
  const [algorithm, setAlgorithm] = useState('SHA-256');
  const [hash, setHash] = useState('');

  useEffect(() => {
    const generate = async () => {
      if (!text || typeof window === 'undefined' || !window.crypto?.subtle) {
        setHash('');
        return;
      }
      const enc = new TextEncoder();
      const data = enc.encode(text);
      try {
        const digest = await window.crypto.subtle.digest(algorithm, data);
        const result = Array.from(new Uint8Array(digest))
          .map((b) => b.toString(16).padStart(2, '0'))
          .join('');
        setHash(result);
      } catch {
        setHash('');
      }
    };
    generate();
  }, [text, algorithm]);

  return (
    <div className="bg-gray-700 text-white p-4 rounded flex flex-col gap-2">
      <h2 className="text-xl mb-2">Hash Converter</h2>
      <textarea
        className="text-black p-1 rounded"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
      />
      <label className="flex flex-col">
        Algorithm
        <select
          className="text-black p-1 rounded"
          value={algorithm}
          onChange={(e) => setAlgorithm(e.target.value)}
        >
          {algorithms.map((alg) => (
            <option key={alg} value={alg}>
              {alg}
            </option>
          ))}
        </select>
      </label>
      <input
        className="text-black p-1 rounded"
        value={hash}
        readOnly
        aria-label="hash result"
      />
    </div>
  );
};

export default HashConverter;

