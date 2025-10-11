import figlet from 'figlet';

export const presetCharSets = {
  standard: '@#S%?*+;:,.',
  blocks: '█▓▒░ ',
  binary: '01',
};

export const palettes = {
  grayscale: [
    [0, 0, 0],
    [85, 85, 85],
    [170, 170, 170],
    [255, 255, 255],
  ],
  ansi16: [
    [0, 0, 0],
    [128, 0, 0],
    [0, 128, 0],
    [128, 128, 0],
    [0, 0, 128],
    [128, 0, 128],
    [0, 128, 128],
    [192, 192, 192],
    [128, 128, 128],
    [255, 0, 0],
    [0, 255, 0],
    [255, 255, 0],
    [0, 0, 255],
    [255, 0, 255],
    [0, 255, 255],
    [255, 255, 255],
  ],
};

const escapeForHtml = (value) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const ensureCharSet = (charSet) => (charSet && charSet.length ? charSet : presetCharSets.standard);

let fontPromise;
const ensureFigletFont = async () => {
  if (!fontPromise) {
    fontPromise = import('figlet/importable-fonts/Standard.js').then((module) => {
      const fontData = module.default || module;
      figlet.parseFont('Standard', fontData);
    });
  }
  await fontPromise;
};

const buildRamp = (charSet, density) => {
  const set = ensureCharSet(charSet);
  const len = Math.min(Math.max(2, density || set.length), set.length);
  if (len === set.length) return set;
  const chars = set.split('');
  const step = chars.length / len;
  let result = '';
  for (let i = 0; i < len; i += 1) {
    result += chars[Math.floor(i * step)] || chars[chars.length - 1];
  }
  return result;
};

const luminance = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

const applyTone = (value, brightness, contrast) => {
  const adjusted = (value - 128 + brightness) * contrast + 128;
  return clamp(adjusted, 0, 255);
};

const mapToPalette = (r, g, b, palette) => {
  if (!palette || !palette.length) return [r, g, b];
  let match = palette[0];
  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < palette.length; i += 1) {
    const [pr, pg, pb] = palette[i];
    const dr = r - pr;
    const dg = g - pg;
    const db = b - pb;
    const dist = dr * dr + dg * dg + db * db;
    if (dist < best) {
      best = dist;
      match = palette[i];
    }
  }
  return match;
};

export const convertImageDataToAscii = (
  { data, width, height },
  {
    charSet,
    density,
    contrast = 1,
    brightness = 0,
    useColor = true,
    palette,
  },
) => {
  if (!width || !height) {
    return {
      plain: '',
      html: '',
      ansi: '',
      colors: null,
      width: 0,
      height: 0,
    };
  }
  const ramp = buildRamp(charSet, density);
  const rampLen = ramp.length;
  const gray = new Float32Array(width * height);
  const colorData = new Uint8ClampedArray(width * height * 3);
  for (let i = 0; i < width * height; i += 1) {
    const idx = i * 4;
    gray[i] = applyTone(luminance(data[idx], data[idx + 1], data[idx + 2]), brightness, contrast);
  }

  let plain = '';
  let html = '';
  let ansi = '';
  for (let y = 0; y < height; y += 1) {
    let plainRow = '';
    let htmlRow = '';
    let ansiRow = '';
    for (let x = 0; x < width; x += 1) {
      const idx = y * width + x;
      const grayValue = clamp(gray[idx], 0, 255);
      const mappedIndex = Math.min(
        rampLen - 1,
        Math.max(0, Math.floor((grayValue / 255) * (rampLen - 1))),
      );
      const mappedValue = (mappedIndex / (rampLen - 1 || 1)) * 255;
      const error = grayValue - mappedValue;
      if (x + 1 < width) gray[idx + 1] += error * (7 / 16);
      if (y + 1 < height) {
        if (x > 0) gray[idx + width - 1] += error * (3 / 16);
        gray[idx + width] += error * (5 / 16);
        if (x + 1 < width) gray[idx + width + 1] += error * (1 / 16);
      }
      const pixelIndex = idx * 4;
      const [r, g, b] = mapToPalette(
        data[pixelIndex],
        data[pixelIndex + 1],
        data[pixelIndex + 2],
        palette,
      );
      const colorIndex = idx * 3;
      colorData[colorIndex] = r;
      colorData[colorIndex + 1] = g;
      colorData[colorIndex + 2] = b;
      const ch = ramp[rampLen - 1 - mappedIndex] || ramp[rampLen - 1];
      const escaped = escapeForHtml(ch);
      plainRow += ch;
      if (useColor) {
        htmlRow += `<span style="color: rgb(${r},${g},${b})">${escaped}</span>`;
        ansiRow += `\u001b[38;2;${r};${g};${b}m${ch}`;
      } else {
        htmlRow += escaped;
        ansiRow += ch;
      }
    }
    plain += `${plainRow}\n`;
    html += `${htmlRow}<br/>`;
    ansi += `${ansiRow}\u001b[0m\n`;
  }

  return {
    plain,
    html,
    ansi,
    colors: { data: colorData, width, height },
    width,
    height,
  };
};

export const renderTextToAscii = async (
  text,
  {
    charSet,
    density,
    contrast = 1,
    brightness = 0,
    useColor = true,
    palette,
    scale = 1,
  },
) => {
  await ensureFigletFont();
  const normalized = text || '';
  const rendered = figlet.textSync(normalized, {
    font: 'Standard',
    horizontalLayout: 'default',
    whitespaceBreak: true,
  });
  const baseLines = rendered.replace(/\s+$/, '').split('\n');
  const width = baseLines.reduce((max, line) => Math.max(max, line.length), 0);
  const height = baseLines.length;
  if (!width || !height) {
    return {
      plain: '',
      html: '',
      ansi: '',
      colors: null,
      width: 0,
      height: 0,
    };
  }
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const buffer = new Uint8ClampedArray(scaledWidth * scaledHeight * 4);
  for (let y = 0; y < scaledHeight; y += 1) {
    for (let x = 0; x < scaledWidth; x += 1) {
      const srcX = Math.floor(x / scale);
      const srcY = Math.floor(y / scale);
      const line = baseLines[srcY] || '';
      const filled = (line[srcX] || ' ') !== ' ';
      const offset = (y * scaledWidth + x) * 4;
      const value = filled ? 255 : 0;
      buffer[offset] = value;
      buffer[offset + 1] = value;
      buffer[offset + 2] = value;
      buffer[offset + 3] = 255;
    }
  }
  return convertImageDataToAscii(
    { data: buffer, width: scaledWidth, height: scaledHeight },
    { charSet, density, contrast, brightness, useColor, palette },
  );
};

