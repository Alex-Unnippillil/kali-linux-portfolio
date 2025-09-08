import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../components/ui/ThemeToggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.dataset.theme = 'default';
    document.documentElement.className = '';
    // @ts-ignore
    window.matchMedia = jest.fn().mockReturnValue({ matches: false });
  });

  test('switches theme and updates variables', async () => {
    const style = document.createElement('style');
    style.innerHTML = `
      :root { --color-bg: white; }
      html[data-theme='dark'] { --color-bg: black; }
    `;
    document.head.appendChild(style);

    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    const getBg = () =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-bg');

    expect(document.documentElement.dataset.theme).toBe('default');
    expect(getBg()).toBe('white');

    await userEvent.click(button);

    expect(document.documentElement.dataset.theme).toBe('dark');
    expect(getBg()).toBe('black');
    expect(window.localStorage.getItem('app:theme')).toBe('dark');
  });
});
