import figlet from 'figlet';
import { loadFont } from './fontLoader';

self.onmessage = async (e) => {
  const { text, font } = e.data;
  await loadFont(font);
  const rendered = figlet.textSync(text || '', { font });
  self.postMessage(rendered);
};
