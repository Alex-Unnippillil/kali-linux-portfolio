import jsQR from 'jsqr';

const flipHorizontal = (data, width, height) => {
  const flipped = new Uint8ClampedArray(data.length);
  const bytes = 4;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const src = (y * width + x) * bytes;
      const dst = (y * width + (width - x - 1)) * bytes;
      for (let i = 0; i < bytes; i += 1) {
        flipped[dst + i] = data[src + i];
      }
    }
  }
  return flipped;
};

self.onmessage = (e) => {
  const { data, width, height, flip } = e.data;
  const input = flip ? flipHorizontal(data, width, height) : data;
  const code = jsQR(input, width, height);
  self.postMessage(code ? code.data : null);
};

