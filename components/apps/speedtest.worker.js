let running = false;
let timer = null;

self.onmessage = (e) => {
  const { type } = e.data || {};
  if (type === 'start' && !running) {
    running = true;
    runTest();
  } else if (type === 'stop' && running) {
    running = false;
    if (timer) clearTimeout(timer);
  }
};

async function runTest() {
  if (!running) return;
  const size = 100000; // bytes
  const url = `https://speed.cloudflare.com/__down?bytes=${size}&cacheBust=${Math.random()}`;
  let speed = 0;
  try {
    const start = performance.now();
    const res = await fetch(url, { cache: 'no-store', mode: 'cors' });
    await res.blob();
    const duration = performance.now() - start;
    speed = (size * 8) / duration / 1000; // Mbps
  } catch (err) {
    // ignore errors, report 0 speed
  }
  self.postMessage({ speed });
  timer = setTimeout(runTest, 1000);
}
