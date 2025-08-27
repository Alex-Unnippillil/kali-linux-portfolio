const categories = {
  SQLi: /sql|database/i,
  XSS: /xss|cross|script/i,
  LFI: /file|path/i,
  RFI: /remote|include/i,
  Info: /info|header|server/i,
};

self.onmessage = (e) => {
  const { text } = e.data;
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  const findings = lines.map((line) => {
    let category = 'Other';
    for (const [key, regex] of Object.entries(categories)) {
      if (regex.test(line)) {
        category = key;
        break;
      }
    }
    return { category, line };
  });
  const clusterCounts = findings.reduce((acc, f) => {
    acc[f.category] = (acc[f.category] || 0) + 1;
    return acc;
  }, {});
  postMessage({ findings, clusterCounts });
};
