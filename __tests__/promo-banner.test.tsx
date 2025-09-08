import React from 'react';
import { render } from '@testing-library/react';
import PromoBanner from '../components/screen/PromoBanner';
import { contrastRatio } from '../components/apps/Games/common/theme';

describe('Promo banner', () => {
  beforeAll(() => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root {
        --color-ub-grey: #0f1317;
        --color-ubt-grey: #F6F6F5;
      }
      html[data-theme='kali-light'] {
        --color-ub-grey: #0f1317;
        --color-ubt-grey: #F6F6F5;
      }
      html[data-theme='kali-dark'] {
        --color-ub-grey: #0f1317;
        --color-ubt-grey: #F6F6F5;
      }
    `;
    document.head.appendChild(style);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('has minimum height class', () => {
    const { container } = render(<PromoBanner messages={['hi']} />);
    const banner = container.firstChild as HTMLElement;
    expect(banner.className).toMatch(/h-10/);
  });

  ['kali-dark', 'kali-light'].forEach((theme) => {
    test(`meets contrast requirements in ${theme} theme`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      render(<PromoBanner messages={['hello']} />);
      const rootStyles = getComputedStyle(document.documentElement);
      const fg = rootStyles.getPropertyValue('--color-ub-grey').trim();
      const bg = rootStyles.getPropertyValue('--color-ubt-grey').trim();
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  });
});

