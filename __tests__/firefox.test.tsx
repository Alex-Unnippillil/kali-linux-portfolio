import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Firefox from '../components/apps/firefox';
import { SettingsContext } from '../hooks/useSettings';

const DEFAULT_GRID_COLOR = '#38bdf8';

const renderFirefox = (options: { highContrast?: boolean } = {}) =>
  render(
    <Firefox />,
    {
      wrapper: ({ children }) => (
        <SettingsContext.Provider
          value={{
            accent: '#1793d1',
            wallpaper: 'wall-2',
            bgImageName: 'wall-2',
            useKaliWallpaper: false,
            density: 'regular',
            reducedMotion: false,
            fontScale: 1,
            highContrast: options.highContrast ?? false,
            largeHitAreas: false,
            pongSpin: true,
            allowNetwork: false,
            haptics: true,
            theme: 'default',
            setAccent: () => {},
            setWallpaper: () => {},
            setUseKaliWallpaper: () => {},
            setDensity: () => {},
            setReducedMotion: () => {},
            setFontScale: () => {},
            setHighContrast: () => {},
            setLargeHitAreas: () => {},
            setPongSpin: () => {},
            setAllowNetwork: () => {},
            setHaptics: () => {},
            setTheme: () => {},
          }}
        >
          {children}
        </SettingsContext.Provider>
      ),
    }
  );

describe('Firefox app', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('renders the default address with a simulation fallback', () => {
    renderFirefox();
    const input = screen.getByLabelText('Address');
    expect(input).toHaveValue('https://www.kali.org/docs/');
    expect(screen.getByRole('heading', { name: 'Kali Linux Documentation' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open kali.org\/docs/i })).toHaveAttribute(
      'href',
      'https://www.kali.org/docs/'
    );
  });

  it('navigates to entered urls', async () => {
    const user = userEvent.setup();
    renderFirefox();
    const input = screen.getByLabelText('Address');
    await user.clear(input);
    await user.type(input, 'example.com');
    await user.click(screen.getByRole('button', { name: 'Go' }));
    const frame = await screen.findByTitle('Firefox');
    expect(frame).toHaveAttribute('src', 'https://example.com/');
    expect(localStorage.getItem('firefox:last-url')).toBe('https://example.com/');
  });

  it('opens bookmarks when clicked and shows their simulations', async () => {
    const user = userEvent.setup();
    renderFirefox();
    const bookmark = await screen.findByRole('button', { name: 'Kali NetHunter' });
    await user.click(bookmark);
    await waitFor(() =>
      expect(screen.getByRole('heading', { name: 'Kali NetHunter & Downloads' })).toBeInTheDocument()
    );
    expect(localStorage.getItem('firefox:last-url')).toBe('https://www.kali.org/get-kali/#kali-platforms');
  });

  it('allows overlays to be toggled via settings and keyboard shortcuts', async () => {
    const user = userEvent.setup();
    renderFirefox();

    await user.click(screen.getByRole('button', { name: /overlay settings/i }));
    const gridToggle = screen.getByRole('checkbox', { name: 'Grid overlay' });
    expect(gridToggle).toBeChecked();
    await user.click(gridToggle);
    expect(screen.queryByTestId('firefox-grid-overlay')).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'g', shiftKey: true });
    expect(screen.getByTestId('firefox-grid-overlay')).toBeInTheDocument();

    const flexToggle = screen.getByRole('checkbox', { name: 'Flex outlines' });
    const overlayContainer = screen.getByTestId('firefox-overlay-container');
    expect(overlayContainer).toHaveAttribute('data-flex-overlay', 'false');
    await user.click(flexToggle);
    expect(overlayContainer).toHaveAttribute('data-flex-overlay', 'true');

    fireEvent.keyDown(window, { key: 'f', shiftKey: true });
    expect(overlayContainer).toHaveAttribute('data-flex-overlay', 'false');

    const guideColorInput = screen.getByLabelText('Guides overlay color');
    fireEvent.change(guideColorInput, { target: { value: '#ff0000' } });
    expect(overlayContainer).toHaveAttribute('data-guide-color', '#ff0000');
  });

  it('adapts overlay colors when high contrast mode is enabled', async () => {
    renderFirefox({ highContrast: true });

    await screen.findByRole('heading', { name: 'Kali Linux Documentation' });
    const overlayContainer = screen.getByTestId('firefox-overlay-container');
    expect(overlayContainer).toHaveAttribute('data-high-contrast', 'true');

    const gridOverlay = screen.getByTestId('firefox-grid-overlay');
    expect(gridOverlay).toHaveAttribute('data-grid-color');
    expect(gridOverlay.getAttribute('data-grid-color')).not.toBe(DEFAULT_GRID_COLOR);
  });
});
