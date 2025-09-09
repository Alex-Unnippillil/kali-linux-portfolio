let cancelled = false;

self.onmessage = ({ data }) => {
  if (data.action === 'parse') {
    cancelled = false;
    const lines = data.text.split(/\r?\n/);
    const total = lines.length;
    const start = Date.now();
    const parsed = [];
    for (let i = 0; i < lines.length; i++) {
      if (cancelled) {
        self.postMessage({ type: 'cancelled' });
        return;
      }
      const line = lines[i];
      const [key, ...rest] = line.split(':');
      parsed.push({
        line: i + 1,
        key: key.trim(),
        value: rest.join(':').trim(),
        raw: line,
      });
      if (i % 100 === 0) {
        const progress = (i + 1) / total;
        const elapsed = Date.now() - start;
        const eta = progress > 0 ? (elapsed * (1 - progress)) / progress : 0;
        self.postMessage({ type: 'progress', progress, eta });
      }
    }
    self.postMessage({ type: 'done', parsed });
  } else if (data.action === 'cancel') {
    cancelled = true;
  }
};

export {};

