import { detectHashType, hashTypes } from '../hashcat';

export const parseRules = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'));

export const distributeTasks = (hashes, endpoints) => {
  const assignments = {};
  if (!endpoints.length) return assignments;
  endpoints.forEach((ep) => {
    assignments[ep] = [];
  });
  hashes.forEach((hash, idx) => {
    const ep = endpoints[idx % endpoints.length];
    assignments[ep].push(hash);
  });
  return assignments;
};

export const identifyHashType = (hash) => {
  const id = detectHashType(hash);
  const match = hashTypes.find((t) => t.id === id);
  return match && match.regex.test(hash) ? match.name : 'Unknown';
};

export const generateIncrementalCandidates = (
  charset = 'abcdefghijklmnopqrstuvwxyz',
  length = 4,
  count = 10
) => {
  const results = [];
  const base = charset.length;
  const max = Math.pow(base, length);
  for (let i = 0; i < count && i < max; i++) {
    let num = i;
    let str = '';
    for (let j = 0; j < length; j++) {
      str = charset[num % base] + str;
      num = Math.floor(num / base);
    }
    results.push(str);
  }
  return results;
};

export const parsePotfile = (text) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const idx = line.indexOf(':');
      if (idx === -1) return null;
      return { hash: line.slice(0, idx), password: line.slice(idx + 1) };
    })
    .filter(Boolean);
