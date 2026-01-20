self.onmessage = (event) => {
  const { id, temps, width = 240, height = 80, padding = 8 } = event.data || {};
  if (!id) return;
  if (!Array.isArray(temps) || temps.length === 0) {
    self.postMessage({ id, points: '', min: null, max: null });
    return;
  }

  const cleaned = temps.filter((t) => typeof t === 'number' && Number.isFinite(t));
  if (cleaned.length === 0) {
    self.postMessage({ id, points: '', min: null, max: null });
    return;
  }

  const maxTemp = Math.max(...cleaned);
  const minTemp = Math.min(...cleaned);
  const range = maxTemp - minTemp;
  const usableWidth = Math.max(width - padding * 2, 0);
  const usableHeight = Math.max(height - padding * 2, 0);
  const midY = padding + usableHeight / 2;

  const points = cleaned
    .map((t, i) => {
      const x =
        cleaned.length === 1
          ? padding + usableWidth / 2
          : padding + (i / (cleaned.length - 1)) * usableWidth;
      const y =
        range === 0
          ? midY
          : padding + ((maxTemp - t) / range) * usableHeight;
      const safeX = Number.isFinite(x) ? x : padding;
      const safeY = Number.isFinite(y) ? y : midY;
      return `${safeX},${safeY}`;
    })
    .join(' ');

  self.postMessage({
    id,
    points,
    min: Number.isFinite(minTemp) ? minTemp : null,
    max: Number.isFinite(maxTemp) ? maxTemp : null,
  });
};
