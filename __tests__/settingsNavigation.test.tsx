import React from 'react';
import { render, screen, within, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Settings from '../apps/settings';
import { SettingsContext } from '../hooks/useSettings';

describe('Settings navigation', () => {
  const originalFetch = global.fetch;
  const noop = () => {};
  const contextValue = {
    accent: '#1793d1',
    setAccent: jest.fn(),
    wallpaper: 'wall-1',
    setWallpaper: jest.fn(),
    density: 'regular',
    setDensity: jest.fn(),
    reducedMotion: false,
    setReducedMotion: jest.fn(),
    fontScale: 1,
    setFontScale: jest.fn(),
    highContrast: false,
    setHighContrast: jest.fn(),
    largeHitAreas: false,
    setLargeHitAreas: noop,
    pongSpin: true,
    setPongSpin: noop,
    allowNetwork: false,
    setAllowNetwork: noop,
    haptics: true,
    setHaptics: jest.fn(),
    theme: 'default',
    setTheme: jest.fn(),
  };

  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue({ json: async () => [] } as any);
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error allow cleanup when fetch is undefined
      delete global.fetch;
    }
    jest.resetAllMocks();
  });

  const renderSettings = () =>
    render(
      <SettingsContext.Provider value={contextValue as any}>
        <Settings />
      </SettingsContext.Provider>
    );

  it('supports keyboard traversal of the navigation tree', async () => {
    const user = userEvent.setup();
    renderSettings();
    const tree = await screen.findByRole('tree', { name: /settings sections/i });
    const items = within(tree).getAllByRole('treeitem');
    items[0].focus();
    await user.keyboard('{ArrowDown}');
    expect(items[1]).toHaveFocus();
  });

  it('focuses deep linked controls when receiving a settings-deeplink event', async () => {
    renderSettings();
    expect(screen.queryByLabelText('Icon size')).toBeNull();
    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('settings-deeplink', {
          detail: { section: 'accessibility', item: 'font-scale' },
        })
      );
    });
    const slider = await screen.findByLabelText('Icon size');
    await waitFor(() => expect(slider).toHaveFocus());
  });
});
