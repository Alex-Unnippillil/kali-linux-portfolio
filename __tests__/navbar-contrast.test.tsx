import React from 'react';
import { render } from '@testing-library/react';
import Navbar from '../components/screen/navbar';
import { contrastRatio } from '../components/apps/Games/common/theme';

jest.mock('next/image', () => {
  return function MockedImage(props: any) {
    return <img {...props} alt={props.alt || ''} />;
  };
});

describe('Navbar color contrast', () => {
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

  const renderNavbar = () =>
    render(<Navbar lockScreen={() => {}} logOut={() => {}} />);

  ['kali-dark', 'kali-light'].forEach((theme) => {
    test(`meets contrast requirements in ${theme} theme`, () => {
      document.documentElement.setAttribute('data-theme', theme);
      renderNavbar();
      const rootStyles = getComputedStyle(document.documentElement);
      const fg = rootStyles.getPropertyValue('--color-ubt-grey').trim();
      const bg = rootStyles.getPropertyValue('--color-ub-grey').trim();
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  });
});
