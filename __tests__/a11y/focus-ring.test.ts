import { contrastRatio } from '../../components/apps/Games/common/theme';

describe('focus ring contrast', () => {
  beforeAll(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --color-focus-ring: #1793d1;
        --color-bg: #0f1317;
      }
    `;
    document.head.appendChild(style);
  });

  test('ring color maintains at least 3:1 contrast with background', () => {
    const rootStyles = getComputedStyle(document.documentElement);
    const ring = rootStyles.getPropertyValue('--color-focus-ring').trim();
    const bg = rootStyles.getPropertyValue('--color-bg').trim();
    expect(contrastRatio(ring, bg)).toBeGreaterThanOrEqual(3);
  });
});
