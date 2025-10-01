import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import Settings from '../apps/settings/index';
import { FileDialogError, openFileDialog } from '../utils/fileDialogs';

jest.mock('../utils/fileDialogs', () => {
  const actual = jest.requireActual('../utils/fileDialogs');
  return {
    ...actual,
    openFileDialog: jest.fn(),
  };
});

jest.mock('../hooks/useSettings', () => {
  const setters = {
    setAccent: jest.fn(),
    setWallpaper: jest.fn(),
    setUseKaliWallpaper: jest.fn(),
    setDensity: jest.fn(),
    setReducedMotion: jest.fn(),
    setFontScale: jest.fn(),
    setHighContrast: jest.fn(),
    setHaptics: jest.fn(),
    setTheme: jest.fn(),
  };
  return {
    useSettings: () => ({
      accent: '#1793d1',
      wallpaper: 'wall-2',
      useKaliWallpaper: false,
      density: 'regular',
      reducedMotion: false,
      fontScale: 1,
      highContrast: false,
      haptics: true,
      theme: 'default',
      ...setters,
    }),
    ACCENT_OPTIONS: ['#1793d1'],
  };
});

jest.mock('../utils/settingsStore', () => ({
  resetSettings: jest.fn(),
  defaults: {
    accent: '#1793d1',
    wallpaper: 'wall-2',
    useKaliWallpaper: false,
    density: 'regular',
    reducedMotion: false,
    fontScale: 1,
    highContrast: false,
    haptics: true,
  },
  exportSettings: jest.fn(() => Promise.resolve('{}')),
  importSettings: jest.fn(() => Promise.resolve()),
}));

jest.mock('../components/Tabs', () =>
  function Tabs({
    tabs,
    onChange,
  }: {
    tabs: { id: string; label: string }[];
    onChange: (id: string) => void;
  }) {
    return (
      <div>
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => onChange(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
    );
  },
);

jest.mock('../components/ToggleSwitch', () => () => <div data-testid="toggle" />);

jest.mock('../components/util-components/kali-wallpaper', () => () => <div data-testid="kali-wallpaper" />);

const mockedOpenFileDialog = openFileDialog as jest.MockedFunction<typeof openFileDialog>;

beforeEach(() => {
  mockedOpenFileDialog.mockReset();
});

it('shows an actionable error when an invalid file is selected', async () => {
  mockedOpenFileDialog.mockRejectedValueOnce(
    new FileDialogError('Settings imports must be JSON exports from the Kali desktop.', 'invalid-type'),
  );

  render(<Settings />);
  fireEvent.click(screen.getByText('Privacy'));
  fireEvent.click(screen.getByText('Import Settings'));

  await waitFor(() => {
    expect(screen.getByText(/Settings imports must be JSON exports/)).toBeInTheDocument();
  });
});

it('provides a sample data fallback for imports', async () => {
  render(<Settings />);
  fireEvent.click(screen.getByText('Privacy'));
  fireEvent.click(screen.getByText('Use sample settings'));

  await waitFor(() => {
    expect(screen.getByText('Loaded sample desktop settings.')).toBeInTheDocument();
  });
});
