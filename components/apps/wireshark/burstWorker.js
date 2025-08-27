let last = 0;
let timeline = [];
self.onmessage = (e) => {
  const pkt = e.data;
  const ts = Number(pkt.timestamp);
  const burstStart = !last || ts - last > 1000;
  timeline = [...timeline, { ...pkt, burstStart }].slice(-500);
  if (burstStart) {
    self.postMessage({ type: 'burst', start: ts });
  }
  last = ts;
  self.postMessage({ type: 'timeline', timeline });
};
