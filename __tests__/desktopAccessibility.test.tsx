import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('@vercel/analytics/next', () => ({ Analytics: () => null }));
jest.mock('@vercel/speed-insights/next', () => ({ SpeedInsights: () => null }));
jest.mock('next/dynamic', () => jest.fn(() => () => null));
jest.mock('../hooks/useSettings', () => {
  const actual = jest.requireActual('../hooks/useSettings');
  const React = require('react');
  return {
    ...actual,
    SettingsProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(React.Fragment, null, children),
  };
});
jest.mock('../components/ui/QuickSettings', () => () => null);
jest.mock('../components/util-components/status', () => () => null);
jest.mock('../components/util-components/clock', () => () => null);
jest.mock('../components/menu/WhiskerMenu', () => () => null);

import MyApp from '../pages/_app.jsx';
import Navbar from '../components/screen/navbar';
import { Desktop } from '../components/screen/desktop';

expect.extend(toHaveNoViolations);

describe('Desktop shell accessibility', () => {
  it('moves focus to the desktop main landmark when using the skip link', async () => {
    const TestComponent = () => <main id="desktop-main" tabIndex={-1}>Main area</main>;
    const user = userEvent.setup();
    render(<MyApp Component={TestComponent} pageProps={{}} />);

    await user.tab();
    const skipLink = screen.getByRole('link', { name: /skip to main content/i });
    expect(skipLink).toHaveFocus();

    await user.keyboard('{Enter}');
    const mainLandmark = screen.getByRole('main');
    expect(mainLandmark).toHaveFocus();
  });

  it('exposes landmark structure recognised by axe', async () => {
    const desktop = new Desktop();
    desktop.props = { clearSession: jest.fn() } as any;

    const { container } = render(
      <>
        <Navbar lockScreen={jest.fn()} shutDown={jest.fn()} />
        {desktop.render()}
      </>
    );

    expect(container.querySelector('#desktop-header')).toBeInTheDocument();
    expect(container.querySelector('#desktop-top-nav')).toBeInTheDocument();
    expect(container.querySelector('#desktop-main')).toBeInTheDocument();
    expect(container.querySelector('#desktop-dock')).toBeInTheDocument();
    expect(container.querySelector('#desktop-footer')).toBeInTheDocument();

    const results = await axe(container, {
      runOnly: {
        type: 'rule',
        values: ['landmark-one-main', 'landmark-unique'],
      },
    });

    expect(results).toHaveNoViolations();
  });
});
