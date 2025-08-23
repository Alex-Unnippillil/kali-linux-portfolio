import React, { useState } from 'react';

const FNV_OFFSET_BASIS = BigInt('0xcbf29ce484222325');
const FNV_PRIME = BigInt('0x100000001b3');
const MASK_64 = BigInt('0xffffffffffffffff');

function fnv1a64(str: string): bigint {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < str.length; i += 1) {
    hash ^= BigInt(str.charCodeAt(i));
    hash = (hash * FNV_PRIME) & MASK_64;
  }
  return hash;
}

function simhash(text: string): bigint {
  const tokens = text.toLowerCase().match(/\w+/g) || [];
  const bits = Array(64).fill(0);
  tokens.forEach((token) => {
    const h = fnv1a64(token);
    for (let i = 0; i < 64; i += 1) {
      const bit = (h >> BigInt(i)) & 1n;
      bits[i] += bit === 1n ? 1 : -1;
    }
  });
  let result = 0n;
  for (let i = 0; i < 64; i += 1) {
    if (bits[i] > 0) result |= 1n << BigInt(i);
  }
  return result;
}

function hammingDistance(a: bigint, b: bigint): number {
  let x = a ^ b;
  let dist = 0;
  while (x !== 0n) {
    dist += 1;
    x &= x - 1n;
  }
  return dist;
}

const ContentFingerprint: React.FC = () => {
  const [textA, setTextA] = useState('');
  const [textB, setTextB] = useState('');

  const hashA = textA ? simhash(textA) : 0n;
  const hashB = textB ? simhash(textB) : 0n;
  const hashAHex = hashA.toString(16).padStart(16, '0');
  const hashBHex = hashB.toString(16).padStart(16, '0');
  const similarity = textA && textB
    ? Math.round((1 - hammingDistance(hashA, hashB) / 64) * 100)
    : null;

  return (
    <div className="h-full w-full bg-gray-900 text-white p-4 flex flex-col space-y-4">
      <div className="flex flex-col md:flex-row md:space-x-4 space-y-4 md:space-y-0 flex-grow">
        <div className="flex-1 flex flex-col">
          <textarea
            className="flex-1 text-black p-2"
            placeholder="Paste first text here..."
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
          />
          <div className="mt-2 text-sm break-all">
            Hash: {textA ? hashAHex : 'N/A'}
          </div>
        </div>
        <div className="flex-1 flex flex-col">
          <textarea
            className="flex-1 text-black p-2"
            placeholder="Paste second text here..."
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
          />
          <div className="mt-2 text-sm break-all">
            Hash: {textB ? hashBHex : 'N/A'}
          </div>
        </div>
      </div>
      {similarity !== null && (
        <div className="text-center text-lg">
          Similarity: {similarity}%
        </div>
      )}
      <div className="text-xs text-gray-400">
        This tool uses a simplified Simhash algorithm for educational purposes and may not be suitable
        for security-critical applications or large-scale deduplication.
      </div>
    </div>
  );
};

export default ContentFingerprint;

