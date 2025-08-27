import figlet from 'figlet';
import standard from 'figlet/importable-fonts/Standard.js';
import slant from 'figlet/importable-fonts/Slant.js';
import big from 'figlet/importable-fonts/Big.js';
import ghost from 'figlet/importable-fonts/Ghost.js';
import small from 'figlet/importable-fonts/Small.js';

figlet.parseFont('Standard', standard);
figlet.parseFont('Slant', slant);
figlet.parseFont('Big', big);
figlet.parseFont('Ghost', ghost);
figlet.parseFont('Small', small);

self.onmessage = (e) => {
  const { text, font, id } = e.data;
  const rendered = figlet.textSync(text || '', { font });
  self.postMessage({ id, rendered });
};
