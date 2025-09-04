import figlet from 'figlet';
import Standard from 'figlet/importable-fonts/Standard.js';
import Slant from 'figlet/importable-fonts/Slant.js';
import Big from 'figlet/importable-fonts/Big.js';
import Small from 'figlet/importable-fonts/Small.js';
import Doom from 'figlet/importable-fonts/Doom.js';
import Banner from 'figlet/importable-fonts/Banner.js';
import Block from 'figlet/importable-fonts/Block.js';
import Shadow from 'figlet/importable-fonts/Shadow.js';

interface FontData {
  name: string;
  data: any;
}

const fonts: FontData[] = [
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

function strip(lines: string[]) {
  return lines.map((l) => l.replace(/\s+$/, ''));
}

function isMonospace(name: string) {
  const chars = 'ABCDE';
  let width: number | undefined;
  for (const ch of chars) {
    const glyph = strip(
      figlet.textSync(ch, { font: name as figlet.Fonts }).split('\n'),
    );
    const w = glyph.reduce((m, line) => Math.max(m, line.length), 0);
    if (width === undefined) width = w;
    else if (w !== width) return false;
  }
  return true;
}

function init() {
  for (const { name } of fonts) {
    const preview = figlet.textSync('Figlet', { font: name as figlet.Fonts });
    const mono = isMonospace(name);
    self.postMessage({ type: 'font', font: name, preview, mono });
  }
}

init();

self.onmessage = (e: MessageEvent<any>) => {
  if (e.data?.type === 'load') {
    const { name, data } = e.data as { name: string; data: string };
    try {
      figlet.parseFont(name, data);
      const preview = figlet.textSync('Figlet', { font: name as figlet.Fonts });
      const mono = isMonospace(name);
      self.postMessage({ type: 'font', font: name, preview, mono });
    } catch {
      /* ignore bad font */
    }
    return;
  }

  const { text = '', font, width = 80, layout = 'default' } = e.data as {
    text: string;
    font: string;
    width: number;
    layout: string;
  };
  if (!font) return;
  const normalized = String(text)
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .join('\n');
  const rendered = figlet.textSync(normalized, {
    font: font as figlet.Fonts,
    width,
    horizontalLayout: layout as figlet.KerningMethods,
  });
  self.postMessage({ type: 'render', output: rendered });
};
