let last = 0;
let timeline = [];
const minuteCounts = {};
self.onmessage = (e) => {
  const pkt = e.data;
  const ts = Number(pkt.timestamp);
  const burstStart = !last || ts - last > 1000;
  timeline = [...timeline, { ...pkt, burstStart }].slice(-500);
  const minute = ts > 1e12 ? Math.floor(ts / 60000) : Math.floor(ts / 60);
  minuteCounts[minute] = (minuteCounts[minute] || 0) + 1;
  const minutes = Object.entries(minuteCounts)
    .map(([m, count]) => ({ minute: Number(m), count }))
    .sort((a, b) => a.minute - b.minute);
  if (burstStart) {
    self.postMessage({ type: 'burst', start: ts });
  }
  last = ts;
  self.postMessage({ type: 'timeline', timeline });
  self.postMessage({ type: 'minutes', minutes });
};
