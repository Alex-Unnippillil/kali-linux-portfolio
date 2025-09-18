import { render, screen, fireEvent, act } from '@testing-library/react';
import Settings from '../components/apps/settings';

const mockSetters = {
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
};

const mockState = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  density: 'regular',
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: false,
  haptics: true,
  theme: 'default',
};

const mockImportSettings = jest.fn().mockResolvedValue(undefined);

jest.mock('../hooks/useSettings', () => ({
  ACCENT_OPTIONS: ['#1793d1', '#ff0000'],
  useSettings: () => ({
    ...mockState,
    ...mockSetters,
  }),
}));

jest.mock('../utils/settingsStore', () => ({
  resetSettings: jest.fn(),
  defaults: {
    accent: '#1793d1',
    wallpaper: 'wall-2',
    density: 'regular',
    reducedMotion: false,
    largeHitAreas: false,
    fontScale: 1,
    highContrast: false,
    pongSpin: true,
    allowNetwork: false,
    haptics: true,
  },
  exportSettings: jest.fn(),
  importSettings: (...args: unknown[]) => mockImportSettings(...args),
}));

jest.mock('react-diff-viewer', () => {
  const React = require('react');
  return function MockDiffViewer(props: { oldValue: string; newValue: string }) {
    return React.createElement(
      'div',
      { 'data-testid': 'diff-viewer' },
      React.createElement('pre', { 'data-testid': 'diff-old' }, props.oldValue),
      React.createElement('pre', { 'data-testid': 'diff-new' }, props.newValue),
    );
  };
});

const createMockFile = (contents: string): File =>
  ({
    text: () => Promise.resolve(contents),
    name: 'settings.json',
    lastModified: Date.now(),
    size: contents.length,
    type: 'application/json',
  } as unknown as File);

describe('Settings import flow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.assign(mockState, {
      accent: '#1793d1',
      wallpaper: 'wall-2',
      density: 'regular',
      reducedMotion: false,
      fontScale: 1,
      highContrast: false,
      largeHitAreas: false,
      pongSpin: true,
      allowNetwork: false,
      haptics: true,
      theme: 'default',
    });
  });

  it('shows a helpful error when the import file contains invalid JSON', async () => {
    render(<Settings />);

    const input = screen.getByLabelText(/import settings file/i) as HTMLInputElement;
    const file = createMockFile('{not-json');

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('Import failed: File is not valid JSON.');
    expect(mockImportSettings).not.toHaveBeenCalled();
  });

  it('opens a diff preview before applying valid imported settings', async () => {
    render(<Settings />);

    const input = screen.getByLabelText(/import settings file/i) as HTMLInputElement;
    const imported = { accent: '#222222', allowNetwork: true };
    const file = createMockFile(JSON.stringify(imported));

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    await screen.findByRole('dialog');
    const diffOld = await screen.findByTestId('diff-old');
    const diffNew = await screen.findByTestId('diff-new');

    expect(diffOld.textContent).toContain('"accent": "#1793d1"');
    expect(diffNew.textContent).toContain('"accent": "#222222"');
    expect(diffNew.textContent).toContain('"allowNetwork": true');
    expect(screen.getByRole('button', { name: /apply import/i })).toBeInTheDocument();
    expect(mockImportSettings).not.toHaveBeenCalled();
  });
});
