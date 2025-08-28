import figlet from 'figlet';

const FONT_URL = 'https://unpkg.com/figlet@1.8.2/fonts';
const loaded = new Set();

async function loadFont(name) {
  if (loaded.has(name)) return;
  const res = await fetch(`${FONT_URL}/${encodeURIComponent(name)}.flf`);
  const data = await res.text();
  figlet.parseFont(name, data);
  loaded.add(name);
}

function strip(lines) {
  return lines.map((l) => l.replace(/\s+$/, ''));
}

function isMonospace(name) {
  const chars = 'ABCDE';
  let width;
  for (const ch of chars) {
    const glyph = strip(figlet.textSync(ch, { font: name }).split('\n'));
    const w = glyph.reduce((m, line) => Math.max(m, line.length), 0);
    if (width === undefined) width = w;
    else if (w !== width) return false;
  }
  return true;
}

async function init() {
  const meta = await fetch(`${FONT_URL}?meta`).then((r) => r.json());
  const fonts = meta.files
    .filter((f) => f.path.endsWith('.flf'))
    .map((f) => f.path.split('/').pop().replace('.flf', ''));
  for (const name of fonts) {
    await loadFont(name);
    const preview = figlet.textSync('Figlet', { font: name });
    const mono = isMonospace(name);
    self.postMessage({ type: 'font', font: name, preview, mono });
  }
}

init();

self.onmessage = async (e) => {
  const { text = '', font } = e.data;
  if (!font) return;
  await loadFont(font);
  const normalized = String(text)
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .join('\n');
  const rendered = figlet.textSync(normalized, { font });
  self.postMessage({ type: 'render', output: rendered });
};
