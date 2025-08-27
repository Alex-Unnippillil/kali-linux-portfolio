self.onmessage = (e) => {
  const { temps } = e.data || {};
  if (!Array.isArray(temps) || temps.length === 0) return;
  const maxTemp = Math.max(...temps);
  const minTemp = Math.min(...temps);
  const points = temps
    .map((t, i) => {
      const x = (i / (temps.length - 1)) * 100;
      const y = ((maxTemp - t) / (maxTemp - minTemp || 1)) * 100;
      return `${x},${y}`;
    })
    .join(' ');
  self.postMessage(points);
};
