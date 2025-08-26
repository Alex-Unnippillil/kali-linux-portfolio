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
