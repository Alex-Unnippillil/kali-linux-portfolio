let last = null;
let timeline = [];
const minuteCounts = {};

const reset = () => {
  last = null;
  timeline = [];
  Object.keys(minuteCounts).forEach((key) => {
    delete minuteCounts[key];
  });
};

const toTimestampMs = (value) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return 0;
  return parsed > 1e12 ? parsed : parsed * 1000;
};

self.onmessage = (e) => {
  if (e.data?.type === 'reset') {
    reset();
    self.postMessage({ type: 'timeline', timeline: [] });
    self.postMessage({ type: 'minutes', minutes: [] });
    return;
  }
  const pkt = e.data?.packet ?? e.data;
  if (!pkt) return;
  const tsMs = toTimestampMs(pkt.timestampMs ?? pkt.timestamp);
  const burstStart = last === null || tsMs - last > 1000;
  timeline = [...timeline, { ...pkt, burstStart }].slice(-500);
  const minute = Math.floor(tsMs / 60000);
  minuteCounts[minute] = (minuteCounts[minute] || 0) + 1;
  const minutes = Object.entries(minuteCounts)
    .map(([m, count]) => ({ minute: Number(m), count }))
    .sort((a, b) => a.minute - b.minute);
  if (burstStart) {
    self.postMessage({ type: 'burst', start: tsMs });
  }
  last = tsMs;
  self.postMessage({ type: 'timeline', timeline });
  self.postMessage({ type: 'minutes', minutes });
};
