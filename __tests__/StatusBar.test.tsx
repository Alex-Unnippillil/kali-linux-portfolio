import { render, screen } from '@testing-library/react';
import StatusBar from '../components/shell/StatusBar';
import useSystemMetrics from '../hooks/useSystemMetrics';
import { useSettings } from '../hooks/useSettings';

jest.mock('../hooks/useSystemMetrics');
jest.mock('../hooks/useSettings');
jest.mock('../hooks/usePrefersReducedMotion', () => jest.fn(() => false));

const mockedUseSystemMetrics = useSystemMetrics as jest.MockedFunction<typeof useSystemMetrics>;
const mockedUseSettings = useSettings as jest.MockedFunction<typeof useSettings>;

const baseSettings = {
  accent: '#1793d1',
  wallpaper: 'wall-2',
  bgImageName: 'wall-2',
  useKaliWallpaper: false,
  density: 'regular' as const,
  reducedMotion: false,
  fontScale: 1,
  highContrast: false,
  largeHitAreas: false,
  pongSpin: true,
  allowNetwork: true,
  haptics: true,
  showStatusClock: true,
  showStatusCpu: true,
  showStatusMemory: true,
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
  setShowStatusClock: jest.fn(),
  setShowStatusCpu: jest.fn(),
  setShowStatusMemory: jest.fn(),
  setTheme: jest.fn(),
};

const createSettings = (overrides?: Partial<typeof baseSettings>) => ({
  ...baseSettings,
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
  setShowStatusClock: jest.fn(),
  setShowStatusCpu: jest.fn(),
  setShowStatusMemory: jest.fn(),
  setTheme: jest.fn(),
  ...(overrides || {}),
});

beforeEach(() => {
  mockedUseSettings.mockImplementation(() => createSettings() as any);
});

afterEach(() => {
  jest.clearAllMocks();
});

test('renders CPU and RAM metrics with formatted percentages', () => {
  mockedUseSystemMetrics.mockReturnValue({
    cpu: 41.6,
    memory: 72.2,
    fps: 60,
    timestamp: Date.now(),
  });

  render(<StatusBar />);

  const cpuGroup = screen.getByRole('group', { name: /cpu usage/i });
  expect(cpuGroup).toHaveTextContent('CPU');
  expect(cpuGroup).toHaveTextContent('42%');

  const ramGroup = screen.getByRole('group', { name: /ram usage/i });
  expect(ramGroup).toHaveTextContent('RAM');
  expect(ramGroup).toHaveTextContent('72%');
});

test('hides widgets when toggled off in settings', () => {
  mockedUseSettings.mockImplementation(() =>
    createSettings({
      showStatusClock: false,
      showStatusCpu: false,
      showStatusMemory: false,
    }) as any,
  );

  mockedUseSystemMetrics.mockReturnValue({ cpu: 10, memory: 20, fps: 30, timestamp: Date.now() });

  render(<StatusBar />);

  expect(screen.queryByRole('group', { name: /cpu usage/i })).toBeNull();
  expect(screen.queryByRole('group', { name: /ram usage/i })).toBeNull();
  expect(screen.queryByLabelText(/system clock/i)).toBeNull();
});

