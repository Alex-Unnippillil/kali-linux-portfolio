import figlet from 'figlet';
// Fonts are stored locally so the app works offline and avoids bundling all
// of figlet's font database. Only the fonts we use are parsed here.
import standard from './fonts/Standard.js';
import slant from './fonts/Slant.js';

figlet.parseFont('Standard', standard);
figlet.parseFont('Slant', slant);

self.onmessage = (e) => {
  const { text, font } = e.data;
  const rendered = figlet.textSync(text || '', { font });
  self.postMessage(rendered);
};
