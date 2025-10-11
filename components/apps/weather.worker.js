self.onmessage = (e) => {
  const { temps } = e.data || {};
  if (!Array.isArray(temps) || temps.length === 0) {
    self.postMessage({ points: '', coords: [] });
    return;
  }
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const denominator = Math.max(temps.length - 1, 1);
  const coords = temps.map((t, i) => {
    const x = (i / denominator) * 100;
    const y = ((maxTemp - t) / (maxTemp - minTemp || 1)) * 100;
    return { x, y };
  });
  const points = coords.map(({ x, y }) => `${x},${y}`).join(' ');
  self.postMessage({ points, coords });
};
