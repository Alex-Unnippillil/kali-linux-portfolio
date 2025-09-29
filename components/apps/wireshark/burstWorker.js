const CONNECT_MESSAGE = '__connect__';
const RELEASE_MESSAGE = '__release__';

const decoder = typeof TextDecoder !== 'undefined' ? new TextDecoder() : null;

const connectPort = (port) => {
  let last = 0;
  let timeline = [];
  const minuteCounts = {};

  const toPacket = (buffer) => {
    try {
      const textDecoder = decoder || new TextDecoder();
      const json = textDecoder.decode(buffer);
      return JSON.parse(json);
    } catch (err) {
      return null;
    }
  };

  const handleMessage = (event) => {
    const data = event.data;
    if (data && data.type === RELEASE_MESSAGE) {
      last = 0;
      timeline = [];
      Object.keys(minuteCounts).forEach((key) => {
        delete minuteCounts[key];
      });
      port.removeEventListener('message', handleMessage);
      port.close();
      return;
    }

    if (data instanceof ArrayBuffer) {
      const pkt = toPacket(data);
      if (!pkt) {
        return;
      }
      const ts = Number(pkt.timestamp);
      const burstStart = !last || ts - last > 1000;
      timeline = [...timeline, { ...pkt, burstStart }].slice(-500);
      const minute = ts > 1e12 ? Math.floor(ts / 60000) : Math.floor(ts / 60);
      minuteCounts[minute] = (minuteCounts[minute] || 0) + 1;
      const minutes = Object.entries(minuteCounts)
        .map(([m, count]) => ({ minute: Number(m), count }))
        .sort((a, b) => a.minute - b.minute);
      if (burstStart) {
        port.postMessage({ type: 'burst', start: ts });
      }
      last = ts;
      port.postMessage({ type: 'timeline', timeline });
      port.postMessage({ type: 'minutes', minutes });
    }
  };

  port.addEventListener('message', handleMessage);
  port.start();
};

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === CONNECT_MESSAGE) {
    const [port] = event.ports;
    if (port) {
      connectPort(port);
    }
  }
});
