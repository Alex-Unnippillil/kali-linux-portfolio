const timers = {};

self.onmessage = (e) => {
  const { type, id } = e.data || {};
  if (!id) return;
  if (type === 'start' && !timers[id]) {
    timers[id] = setInterval(() => {
      self.postMessage({ type: 'tick', id });
    }, 1000);
  } else if (type === 'stop' && timers[id]) {
    clearInterval(timers[id]);
    delete timers[id];
  }
};

