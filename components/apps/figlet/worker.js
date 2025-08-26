import figlet from 'figlet';
import standard from 'figlet/importable-fonts/Standard.js';
import slant from 'figlet/importable-fonts/Slant.js';

figlet.parseFont('Standard', standard);
figlet.parseFont('Slant', slant);

self.onmessage = (e) => {
  const { text, font } = e.data;
  const rendered = figlet.textSync(text || '', { font });
  self.postMessage(rendered);
};
