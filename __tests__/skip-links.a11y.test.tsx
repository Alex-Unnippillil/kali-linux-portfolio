import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../pages/index';

jest.mock('../components/SEO/Meta', () => ({
  __esModule: true,
  default: function MockMeta() {
    return null;
  },
}));
jest.mock('../components/BetaBadge', () => ({
  __esModule: true,
  default: function MockBetaBadge() {
    return null;
  },
}));
jest.mock('../components/ubuntu', () => ({
  __esModule: true,
  default: function MockUbuntu() {
    return (
      <div>
        <main id="desktop" tabIndex={-1} data-testid="desktop-target" />
        <nav id="desktop-dock" tabIndex={-1} data-testid="dock-target" />
        <button id="desktop-launcher" type="button">
          Launcher
        </button>
      </div>
    );
  },
}));

describe('homepage skip links', () => {
  it('renders skip links for desktop, dock, and launcher', () => {
    render(<App />);

    expect(screen.getByRole('link', { name: /skip to desktop/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to dock/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /skip to launcher/i })).toBeInTheDocument();
  });

  it('focuses desktop when the skip link is activated', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('link', { name: /skip to desktop/i }));

    expect(document.activeElement).toHaveAttribute('id', 'desktop');
  });

  it('supports activating skip links with the space key', async () => {
    const user = userEvent.setup();
    render(<App />);

    const dockLink = screen.getByRole('link', { name: /skip to dock/i });
    dockLink.focus();
    expect(document.activeElement).toBe(dockLink);

    await user.keyboard('[Space]');

    expect(document.activeElement).toHaveAttribute('id', 'desktop-dock');
  });
});
