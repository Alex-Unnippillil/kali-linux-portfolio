import fs from 'fs';
import path from 'path';

describe('watermark styles', () => {
  test('exports dragon watermark class', () => {
    const cssPath = path.join(__dirname, '..', 'styles', 'watermarks.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    expect(css).toMatch(/\.dragon-watermark\s*\{/);
  });
});
