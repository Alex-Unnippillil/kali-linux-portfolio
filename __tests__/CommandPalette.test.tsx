import { render, fireEvent, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import CommandPalette from '../components/common/CommandPalette';
import { SettingsContext } from '../hooks/useSettings';
import { loadCommandPaletteItems } from '../utils/commandPaletteData';

jest.mock('next/router', () => {
  const pushMock = jest.fn();
  return {
    useRouter: () => ({
      push: pushMock,
    }),
    __esModule: true,
    pushMock,
  };
});

jest.mock('../utils/commandPaletteData', () => ({
  loadCommandPaletteItems: jest.fn(),
}));

type PaletteItem = Awaited<ReturnType<typeof loadCommandPaletteItems>> extends Array<infer Item>
  ? Item
  : never;

const createPaletteItems = (): PaletteItem[] => [
  {
    id: 'terminal',
    title: 'Terminal',
    description: 'Simulated shell environment',
    icon: '/terminal.svg',
    keywords: ['terminal', 'shell'],
    group: 'app',
    action: { type: 'open-app', target: 'terminal' },
  } as PaletteItem,
  {
    id: 'command-help-keyboard',
    title: 'Keyboard Reference',
    description: 'View keyboard shortcuts and desktop tips.',
    keywords: ['keyboard', 'help', 'shortcuts'],
    group: 'help',
    action: { type: 'navigate', target: '/keyboard-reference' },
  } as PaletteItem,
];

const baseSettings = {
  accent: '#1793d1',
  wallpaper: 'wall-1',
  bgImageName: 'wall-1',
  useKaliWallpaper: false,
  density: 'regular' as const,
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: false,
  allowNetwork: false,
  haptics: false,
  theme: 'default',
  setAccent: jest.fn(),
  setWallpaper: jest.fn(),
  setUseKaliWallpaper: jest.fn(),
  setDensity: jest.fn(),
  setReducedMotion: jest.fn(),
  setFontScale: jest.fn(),
  setHighContrast: jest.fn(),
  setLargeHitAreas: jest.fn(),
  setPongSpin: jest.fn(),
  setAllowNetwork: jest.fn(),
  setHaptics: jest.fn(),
  setTheme: jest.fn(),
};

const renderWithSettings = (ui: ReactElement) =>
  render(<SettingsContext.Provider value={baseSettings}>{ui}</SettingsContext.Provider>);

describe('CommandPalette', () => {
  const mockedLoader = loadCommandPaletteItems as jest.MockedFunction<typeof loadCommandPaletteItems>;
  const pushMock = (jest.requireMock('next/router') as { pushMock: jest.Mock }).pushMock;

  beforeEach(() => {
    mockedLoader.mockResolvedValue(createPaletteItems());
    pushMock.mockReset();
  });

  it('opens on Ctrl+K and launches the selected app with Enter', async () => {
    renderWithSettings(<CommandPalette />);

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    try {
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });

      await waitFor(() => expect(mockedLoader).toHaveBeenCalled());

      const input = await screen.findByLabelText('Search apps and commands');
      fireEvent.change(input, { target: { value: 'term' } });

      await screen.findByRole('option', { name: /Terminal/i });

      fireEvent.keyDown(input, { key: 'Enter' });

      const openEvent = dispatchSpy.mock.calls.find(([event]) => event.type === 'open-app')?.[0];
      expect(openEvent).toBeDefined();
      expect(openEvent?.detail).toBe('terminal');
    } finally {
      dispatchSpy.mockRestore();
    }
  });

  it('supports Cmd+K and navigates to help entries', async () => {
    renderWithSettings(<CommandPalette />);

    fireEvent.keyDown(window, { key: 'k', metaKey: true });

    const input = await screen.findByLabelText('Search apps and commands');
    fireEvent.change(input, { target: { value: 'keyboard' } });

    await screen.findByRole('option', { name: /Keyboard Reference/i });

    fireEvent.keyDown(input, { key: 'Enter' });

    expect(pushMock).toHaveBeenCalledWith('/keyboard-reference');
  });
});
