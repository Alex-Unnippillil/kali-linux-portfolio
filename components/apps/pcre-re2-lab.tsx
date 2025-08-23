'use client';

import React, { useState } from 'react';
import { RE2 } from 're2-wasm';

const PcreRe2Lab: React.FC = () => {
  const [pattern, setPattern] = useState('');
  const [text, setText] = useState('');
  const [nativeTime, setNativeTime] = useState(0);
  const [re2Time, setRe2Time] = useState(0);
  const [nativeResult, setNativeResult] = useState<string | null>(null);
  const [re2Result, setRe2Result] = useState<string | null>(null);
  const [error, setError] = useState('');

  const run = () => {
    setError('');
    setNativeResult(null);
    setRe2Result(null);
    // Native RegExp
    try {
      const native = new RegExp(pattern, 'gu');
      const start = performance.now();
      const matches = text.match(native);
      setNativeTime(performance.now() - start);
      setNativeResult(matches ? JSON.stringify(matches) : 'null');
    } catch (e: any) {
      setError(`Native error: ${e.message}`);
      setNativeTime(0);
    }
    // RE2 engine
    try {
      const re2 = new RE2(pattern, 'gu');
      const start = performance.now();
      const matches = re2.match(text);
      setRe2Time(performance.now() - start);
      setRe2Result(matches ? JSON.stringify(matches) : 'null');
    } catch (e: any) {
      setError((prev) => (prev ? prev + ' ' : '') + `RE2 error: ${e.message}`);
      setRe2Time(0);
    }
  };

  return (
    <div className="h-full w-full p-4 bg-gray-900 text-white flex flex-col space-y-2">
      <div className="flex space-x-2">
        <input
          className="flex-1 px-2 py-1 text-black rounded"
          placeholder="Pattern"
          value={pattern}
          onChange={(e) => setPattern(e.target.value)}
        />
        <button className="px-3 py-1 bg-blue-600 rounded" onClick={run}>
          Run
        </button>
      </div>
      <textarea
        className="w-full h-32 p-2 text-black rounded"
        placeholder="Test text"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      {error && <div className="text-red-500">{error}</div>}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1 overflow-auto">
        <div>
          <h3 className="font-bold">Native RegExp</h3>
          <div>Time: {nativeTime.toFixed(3)} ms</div>
          <pre className="bg-gray-800 p-2 rounded overflow-auto whitespace-pre-wrap">{nativeResult}</pre>
        </div>
        <div>
          <h3 className="font-bold">RE2</h3>
          <div>Time: {re2Time.toFixed(3)} ms</div>
          <pre className="bg-gray-800 p-2 rounded overflow-auto whitespace-pre-wrap">{re2Result}</pre>
        </div>
      </div>
    </div>
  );
};

export default PcreRe2Lab;

export const displayPcreRe2Lab = () => <PcreRe2Lab />;

