import React, { useState } from 'react';
import * as argon2 from 'argon2-browser';
import bcrypt from 'bcryptjs';

const ArgonBcryptDemo: React.FC = () => {
  const [algo, setAlgo] = useState<'argon2' | 'bcrypt'>('argon2');
  const [timeCost, setTimeCost] = useState(3);
  const [memoryCost, setMemoryCost] = useState(4096);
  const [parallelism, setParallelism] = useState(1);
  const [rounds, setRounds] = useState(10);
  const [text, setText] = useState('');
  const [hash, setHash] = useState('');
  const [ms, setMs] = useState<number | null>(null);

  const handleHash = async () => {
    if (!text) return;
    const start = performance.now();
    let result = '';
    if (algo === 'argon2') {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const res = await argon2.hash({
        pass: text,
        salt,
        time: timeCost,
        mem: memoryCost,
        parallelism,
        type: argon2.ArgonType.Argon2id,
      });
      result = res.encoded;
    } else {
      result = await bcrypt.hash(text, rounds);
    }
    setHash(result);
    setMs(performance.now() - start);
  };

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex flex-wrap gap-2 items-center">
        <label htmlFor="algo">Algorithm:</label>
        <select
          id="algo"
          value={algo}
          onChange={(e) => setAlgo(e.target.value as 'argon2' | 'bcrypt')}
          className="text-black px-2 py-1 rounded"
        >
          <option value="argon2">Argon2</option>
          <option value="bcrypt">bcrypt</option>
        </select>
        {algo === 'argon2' ? (
          <>
            <input
              type="number"
              value={timeCost}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setTimeCost(Number.isNaN(val) ? 1 : val);
              }}
              placeholder="Time"
              className="w-20 text-black px-2 py-1 rounded"
            />
            <input
              type="number"
              value={memoryCost}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setMemoryCost(Number.isNaN(val) ? 1024 : val);
              }}
              placeholder="Memory (KB)"
              className="w-28 text-black px-2 py-1 rounded"
            />
            <input
              type="number"
              value={parallelism}
              onChange={(e) => {
                const val = parseInt(e.target.value, 10);
                setParallelism(Number.isNaN(val) ? 1 : val);
              }}
              placeholder="Parallel"
              className="w-24 text-black px-2 py-1 rounded"
            />
          </>
        ) : (
          <input
            type="number"
            value={rounds}
            onChange={(e) => setRounds(parseInt(e.target.value, 10))}
            placeholder="Rounds"
            className="w-24 text-black px-2 py-1 rounded"
          />
        )}
      </div>
      <textarea
        className="flex-1 text-black p-2 rounded"
        placeholder="Plaintext"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <button
        type="button"
        onClick={handleHash}
        className="px-4 py-2 bg-blue-600 rounded"
      >
        Hash
      </button>
      {hash && (
        <div className="break-all">
          <div className="font-mono">{hash}</div>
          {ms !== null && (
            <div className="mt-2">Time: {ms.toFixed(2)} ms</div>
          )}
        </div>
      )}
    </div>
  );
};

export default ArgonBcryptDemo;
export const displayArgonBcryptDemo = () => <ArgonBcryptDemo />;

