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
  if (/^[a-fA-F0-9]{32}$/.test(hash)) return 'MD5';
  if (/^[a-fA-F0-9]{40}$/.test(hash)) return 'SHA1';
  if (/^[a-fA-F0-9]{64}$/.test(hash)) return 'SHA256';
  return 'Unknown';
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
