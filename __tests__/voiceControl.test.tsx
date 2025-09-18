import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import Desktop from '../components/ubuntu/Desktop';
import { SettingsContext } from '../hooks/useSettings';

const desktopMethods = {
  openApp: jest.fn(),
  cycleApps: jest.fn(),
  cycleAppWindows: jest.fn(),
  closeApp: jest.fn(),
  minimizeAllWindows: jest.fn(),
  getFocusedWindowId: jest.fn(() => 'terminal'),
};

jest.mock('../components/screen/desktop', () => {
  const React = require('react');
  const LegacyDesktop = React.forwardRef((_props: any, ref) => {
    React.useImperativeHandle(ref, () => desktopMethods);
    return <div data-testid="legacy-desktop" />;
  });
  LegacyDesktop.displayName = 'LegacyDesktopMock';
  return { __esModule: true, default: LegacyDesktop };
});

const renderWithSettings = () => {
  const value = {
    accent: '#1793d1',
    wallpaper: 'wall-1',
    density: 'regular' as const,
    reducedMotion: false,
    fontScale: 1,
    highContrast: false,
    largeHitAreas: false,
    pongSpin: true,
    allowNetwork: false,
    haptics: true,
    theme: 'default',
    voiceControlEnabled: true,
    voiceControlHotkey: 'Ctrl+Shift+Space',
    voiceConfirmation: true,
    setAccent: jest.fn(),
    setWallpaper: jest.fn(),
    setDensity: jest.fn(),
    setReducedMotion: jest.fn(),
    setFontScale: jest.fn(),
    setHighContrast: jest.fn(),
    setLargeHitAreas: jest.fn(),
    setPongSpin: jest.fn(),
    setAllowNetwork: jest.fn(),
    setHaptics: jest.fn(),
    setTheme: jest.fn(),
    setVoiceControlEnabled: jest.fn(),
    setVoiceControlHotkey: jest.fn(),
    setVoiceConfirmation: jest.fn(),
  };
  return render(
    <SettingsContext.Provider value={value as any}>
      <Desktop bg_image_name="wall-1" changeBackgroundImage={jest.fn()} />
    </SettingsContext.Provider>,
  );
};

describe('voice control desktop integration', () => {
  beforeEach(() => {
    Object.values(desktopMethods).forEach((method) => (method as jest.Mock).mockClear?.());
    desktopMethods.getFocusedWindowId.mockReturnValue('terminal');
  });

  it('opens apps when matching voice command is received', async () => {
    renderWithSettings();
    act(() => {
      window.dispatchEvent(new CustomEvent('voice:mock-result', { detail: 'open settings' }));
    });
    await waitFor(() => expect(desktopMethods.openApp).toHaveBeenCalledWith('settings'));
  });

  it('cycles windows via navigation commands', async () => {
    renderWithSettings();
    act(() => {
      window.dispatchEvent(new CustomEvent('voice:mock-result', { detail: 'focus next window' }));
    });
    await waitFor(() => expect(desktopMethods.cycleApps).toHaveBeenCalledWith(1));
  });

  it('requires confirmation before closing windows', async () => {
    renderWithSettings();
    act(() => {
      window.dispatchEvent(new CustomEvent('voice:mock-result', { detail: 'close window' }));
    });
    expect(desktopMethods.closeApp).not.toHaveBeenCalled();
    expect(screen.getByText(/confirm “close window”/i)).toBeInTheDocument();
    act(() => {
      window.dispatchEvent(new CustomEvent('voice:mock-result', { detail: 'confirm' }));
    });
    await waitFor(() => expect(desktopMethods.closeApp).toHaveBeenCalledWith('terminal'));
  });

  it('inserts dictated text into the focused element', () => {
    renderWithSettings();
    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();
    act(() => {
      window.dispatchEvent(new CustomEvent('voice:mock-result', { detail: 'type hello world' }));
    });
    expect(input.value).toBe('hello world');
    document.body.removeChild(input);
  });
});
