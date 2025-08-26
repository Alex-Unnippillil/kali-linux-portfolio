import figlet from 'figlet';
import standard from 'figlet/importable-fonts/Standard.js';
import slant from 'figlet/importable-fonts/Slant.js';

figlet.parseFont('Standard', standard);
figlet.parseFont('Slant', slant);

self.onmessage = (e) => {
  const { type } = e.data;
  if (type === 'parseFont') {
    const { name, data } = e.data;
    figlet.parseFont(name, data);
    self.postMessage({ type: 'fontParsed', name });
  } else if (type === 'render') {
    const { text, font } = e.data;
    const rendered = figlet.textSync(text || '', { font });
    self.postMessage({ type: 'render', output: rendered });
  }
};
