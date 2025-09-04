import fs from 'fs';
import path from 'path';

test('reduced motion styles disable transitions', () => {
  const cssPath = path.join(__dirname, '..', 'styles', 'index.css');
  const css = fs.readFileSync(cssPath, 'utf8');
  expect(css).toMatch(/\.reduced-motion \*, \.reduced-motion \*::before, \.reduced-motion \*::after \{[\s\S]*transition-duration: 0.01ms !important;/);
});
