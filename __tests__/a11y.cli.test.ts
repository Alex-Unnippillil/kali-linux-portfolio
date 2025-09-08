/** @jest-environment node */
import { execFileSync } from 'child_process';
import path from 'path';

it('axe cli reports no violations on fixture', () => {
  const html = 'file://' + path.join(__dirname, 'fixtures', 'a11y-test.html');
  execFileSync(
    'npx',
    [
      'axe',
      html,
      '--rules',
      'label,color-contrast,focus-order-semantics',
      '--tags',
      'wcag2a,wcag2aa,wcag22a,wcag22aa',
      '--exit',
      '1',
    ],
    { stdio: 'inherit' }
  );
});
