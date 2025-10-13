self.onmessage = (e) => {
  if (e.data?.cancel) return;
  const target = e.data?.target ?? 100;
  let current = 0;
  const tick = () => {
    current += 1;
    self.postMessage(current);
    if (current < target) {
      setTimeout(tick, 100);
    }
  };
  tick();
};
