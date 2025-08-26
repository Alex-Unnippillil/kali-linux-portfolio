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

export const getSampleCrack = (type) => {
  const samples = {
    MD5: 'password123',
    SHA1: 'letmein',
    SHA256: 'qwerty123',
    Unknown: 'N/A',
  };
  return samples[type] || 'N/A';
};

export const estimateCrackTime = (type, wordlist) => {
  const base = { MD5: 1, SHA1: 5, SHA256: 10 }[type] || 0;
  const factors = { 'rockyou.txt': 1, 'top100.txt': 0.1, 'custom.txt': 2 };
  if (!base) return 'unknown';
  return `${(base * (factors[wordlist] || 1)).toFixed(1)}s`;
};
