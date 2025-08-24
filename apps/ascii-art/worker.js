self.onmessage = async (e) => {
  const { bitmap, charSet, fontSize, charWidth, useColor, palette } = e.data;
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  const safeFont = clamp(fontSize || 8, 1, 100);
  const safeChar = clamp(charWidth || safeFont, 1, 1000);
  const rawWidth = Math.floor(bitmap.width / safeChar);
  const rawHeight = Math.floor(bitmap.height / safeFont);
  const MAX_DIM = 1000;
  const width = clamp(rawWidth, 1, MAX_DIM);
  const height = clamp(rawHeight, 1, MAX_DIM);
  const chars = charSet.split('');
  let canvas;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else {
    canvas = new OffscreenCanvas(width, height); // rely on polyfill? fallback
  }
  const ctx = canvas.getContext('2d');
  ctx.drawImage(bitmap, 0, 0, width, height);
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const colors = new Uint8ClampedArray(width * height * 3);
  const gray = new Float32Array(width * height);
  // Prepare grayscale array for dithering
  for (let i = 0; i < width * height; i += 1) {
    const idx = i * 4;
    const r = data[idx];
    const g = data[idx + 1];
    const b = data[idx + 2];
    gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
  }
  let plain = '';
  let html = '';
  let ansi = '';
  const paletteArr = palette || [];
  const mapToPalette = (r, g, b) => {
    if (!paletteArr.length) return [r, g, b];
    let best = paletteArr[0];
    let bestDist = Infinity;
    for (let i = 0; i < paletteArr.length; i += 1) {
      const p = paletteArr[i];
      const dr = r - p[0];
      const dg = g - p[1];
      const db = b - p[2];
      const dist = dr * dr + dg * dg + db * db;
      if (dist < bestDist) {
        bestDist = dist;
        best = p;
      }
    }
    return best;
  };
  for (let y = 0; y < height; y += 1) {
    let plainRow = '';
    let htmlRow = '';
    let ansiRow = '';
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const gx = gray[idx];
      const charIndex = Math.floor((gx / 255) * (chars.length - 1));
      const newPixel = (charIndex / (chars.length - 1)) * 255;
      const error = gx - newPixel;
      // Floyd-Steinberg dithering
      if (x + 1 < width) gray[idx + 1] += error * (7 / 16);
      if (y + 1 < height) {
        if (x > 0) gray[idx + width - 1] += error * (3 / 16);
        gray[idx + width] += error * (5 / 16);
        if (x + 1 < width) gray[idx + width + 1] += error * (1 / 16);
      }
      const pixelIndex = idx * 4;
      let r = data[pixelIndex];
      let g = data[pixelIndex + 1];
      let b = data[pixelIndex + 2];
      [r, g, b] = mapToPalette(r, g, b);
      const cIdx = idx * 3;
      colors[cIdx] = r;
      colors[cIdx + 1] = g;
      colors[cIdx + 2] = b;
      const ch = chars[chars.length - 1 - charIndex];
      plainRow += ch;
      if (useColor) {
        htmlRow += `<span style="color: rgb(${r},${g},${b})">${ch}</span>`;
        ansiRow += `\u001b[38;2;${r};${g};${b}m${ch}`;
      } else {
        htmlRow += ch;
        ansiRow += ch;
      }
    }
    plain += `${plainRow}\n`;
    html += `${htmlRow}<br/>`;
    ansi += `${ansiRow}\u001b[0m\n`;
  }
  self.postMessage({ plain, html, ansi, width, height, colors }, [colors.buffer]);
};
