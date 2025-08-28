import figlet from 'figlet';
import Standard from 'figlet/importable-fonts/Standard.js';
import Slant from 'figlet/importable-fonts/Slant.js';
import Big from 'figlet/importable-fonts/Big.js';
import Small from 'figlet/importable-fonts/Small.js';
import Doom from 'figlet/importable-fonts/Doom.js';
import Banner from 'figlet/importable-fonts/Banner.js';
import Block from 'figlet/importable-fonts/Block.js';
import Shadow from 'figlet/importable-fonts/Shadow.js';

const fonts = [
  { name: 'Standard', data: Standard },
  { name: 'Slant', data: Slant },
  { name: 'Big', data: Big },
  { name: 'Small', data: Small },
  { name: 'Doom', data: Doom },
  { name: 'Banner', data: Banner },
  { name: 'Block', data: Block },
  { name: 'Shadow', data: Shadow },
];

fonts.forEach(({ name, data }) => figlet.parseFont(name, data));

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

function init() {
  for (const { name } of fonts) {
    const preview = figlet.textSync('Figlet', { font: name });
    const mono = isMonospace(name);
    self.postMessage({ type: 'font', font: name, preview, mono });
  }
}

init();

self.onmessage = (e) => {
  const { text = '', font } = e.data;
  if (!font) return;
  const normalized = String(text)
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .join('\n');
  const rendered = figlet.textSync(normalized, { font });
  self.postMessage({ type: 'render', output: rendered });
};
