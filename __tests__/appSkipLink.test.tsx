import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

jest.mock('@vercel/analytics/next', () => ({
  Analytics: () => null,
}));

jest.mock('@vercel/speed-insights/next', () => ({
  SpeedInsights: () => null,
}));

jest.mock('next/script', () => function MockScript() {
  return null;
});

jest.mock('next/font/google', () => ({
  Ubuntu: () => ({ className: 'mock-ubuntu-font' }),
}));

import MyApp from '../pages/_app';

describe('MyApp skip link accessibility', () => {
  const LauncherPage = () => <button type="button">Launcher focusable control</button>;
  const AppsPage = () => <a href="#apps">Apps link</a>;

  it('places the skip link first in the tab order', async () => {
    const user = userEvent.setup();
    render(<MyApp Component={LauncherPage} pageProps={{}} />);

    await user.tab();

    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(document.activeElement).toBe(skipLink);
  });

  it('moves focus to the main content container when activated across pages', async () => {
    const user = userEvent.setup();
    const { rerender } = render(<MyApp Component={LauncherPage} pageProps={{}} />);

    let skipLink = screen.getByRole('link', { name: /skip to main content/i });
    await user.click(skipLink);

    let mainContent = document.getElementById('app-main-content');
    expect(mainContent).not.toBeNull();
    expect(document.activeElement).toBe(mainContent);

    rerender(<MyApp Component={AppsPage} pageProps={{}} />);

    skipLink = screen.getByRole('link', { name: /skip to main content/i });
    await user.click(skipLink);

    mainContent = document.getElementById('app-main-content');
    expect(mainContent).not.toBeNull();
    expect(document.activeElement).toBe(mainContent);
  });
});
