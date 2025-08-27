import fs from 'fs';
import path from 'path';
import figlet from 'figlet';
import { rasterizeFiglet } from '../components/apps/figlet/rasterize';

describe('Figlet utilities', () => {
  test('font choice changes output', () => {
    const standardPath = path.join(__dirname, '../components/apps/figlet/fonts/Standard.flf');
    const slantPath = path.join(__dirname, '../components/apps/figlet/fonts/Slant.flf');
    const standard = fs.readFileSync(standardPath, 'utf-8');
    const slant = fs.readFileSync(slantPath, 'utf-8');
    figlet.parseFont('Standard', standard);
    figlet.parseFont('Slant', slant);
    const std = figlet.textSync('Hi', { font: 'Standard' });
    const sl = figlet.textSync('Hi', { font: 'Slant' });
    expect(std).not.toBe(sl);
  });

  test('rasterize produces data url', () => {
    HTMLCanvasElement.prototype.getContext = () => ({
      font: '',
      fillStyle: '',
      fillText: () => {},
      measureText: (text) => ({ width: text.length * 10 }),
    });
    HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,abc';
    const url = rasterizeFiglet('test');
    expect(url).toMatch(/^data:image\/png/);
  });
});
