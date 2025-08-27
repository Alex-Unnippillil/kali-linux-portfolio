const MAX_TEXT_SIZE = 500000; // ~500kb
const MAX_LINES = 10000;

const categories = {
  SQLi: /sql|database/i,
  XSS: /xss|cross|script/i,
  LFI: /file|path/i,
  RFI: /remote|include/i,
  Info: /info|header|server/i,
};

self.onmessage = (e) => {
  const text = e.data?.text;
  if (typeof text !== 'string' || text.length > MAX_TEXT_SIZE) {
    postMessage({ error: 'Input too large' });
    return;
  }
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length > MAX_LINES) {
    postMessage({ error: 'Input too large' });
    return;
  }
  const clusters = {};

  lines.forEach((line) => {
    let category = 'Other';
    for (const [key, regex] of Object.entries(categories)) {
      if (regex.test(line)) {
        category = key;
        break;
      }
    }
    if (!clusters[category]) {
      clusters[category] = { count: 0, proofs: [] };
    }
    clusters[category].count += 1;
    clusters[category].proofs.push(line);
  });

  postMessage({ clusters });
};
