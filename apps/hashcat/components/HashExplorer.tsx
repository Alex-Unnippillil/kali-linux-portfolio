'use client';

import React, { useState } from 'react';
import { detectHash } from '../utils/hashDetect';

const HashExplorer: React.FC = () => {
  const [sample, setSample] = useState('');
  const match = detectHash(sample);

  return (
    <div className="p-4 bg-gray-900 text-white min-h-screen space-y-4">
      <h1 className="text-2xl">Hash Explorer</h1>

      <div>
        <label htmlFor="hash-input" className="block mb-1">
          Hash
        </label>
        <input
          id="hash-input"
          type="text"
          value={sample}
          onChange={(e) => setSample(e.target.value)}
          className="w-full p-2 text-black rounded font-mono"
          placeholder="Paste hash here"
        />
      </div>

      <div>
        <h2 className="text-xl mb-1">Result</h2>
        {match ? (
          <div>
            <div className="font-bold">{match.name}</div>
            <p className="text-sm mt-1">{match.description}</p>
          </div>
        ) : (
          <div>Unknown or unsupported hash format.</div>
        )}
      </div>
    </div>
  );
};

export default HashExplorer;
