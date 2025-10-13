const scaleRadius = (cvss) => cvss * 5;

self.onmessage = (e) => {
  const { hosts = [], filter = 'All' } = e.data || {};
  const filtered =
    filter === 'All' ? hosts : hosts.filter((h) => h.severity === filter);
  const processed = filtered.map((h, i) => ({
    ...h,
    radius: scaleRadius(h.cvss),
    index: i,
  }));
  self.postMessage(processed);
};
