import React from 'react';
import { render } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';
import Navbar from '../components/screen/navbar';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => ({
  __esModule: true,
  default: function MockBackgroundImage() {
    return <div data-testid="background" />;
  },
}));
jest.mock('../components/desktop/Window', () => ({
  __esModule: true,
  default: function MockWindow() {
    return <div data-testid="window" />;
  },
}));
jest.mock('../components/base/ubuntu_app', () => ({
  __esModule: true,
  default: function MockUbuntuApp() {
    return <div data-testid="ubuntu-app" />;
  },
}));
jest.mock('../components/base/SystemOverlayWindow', () => ({
  __esModule: true,
  default: function MockSystemOverlayWindow({ children }: { children: React.ReactNode }) {
    return <div data-testid="system-overlay">{children}</div>;
  },
}));
jest.mock('../components/screen/all-applications', () => ({
  __esModule: true,
  default: function MockAllApplications() {
    return <div data-testid="all-applications" />;
  },
}));
jest.mock('../components/screen/shortcut-selector', () => ({
  __esModule: true,
  default: function MockShortcutSelector() {
    return <div data-testid="shortcut-selector" />;
  },
}));
jest.mock('../components/screen/window-switcher', () => ({
  __esModule: true,
  default: function MockWindowSwitcher() {
    return <div data-testid="window-switcher" />;
  },
}));
jest.mock('../components/ui/CommandPalette', () => ({
  __esModule: true,
  default: function MockCommandPalette() {
    return <div data-testid="command-palette" />;
  },
}));
jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: function MockDesktopMenu() {
    return <div data-testid="desktop-menu" />;
  },
}));
jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: function MockDefaultMenu() {
    return <div data-testid="default-menu" />;
  },
}));
jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: function MockAppMenu() {
    return <div data-testid="app-menu" />;
  },
}));
jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: function MockTaskbarMenu() {
    return <div data-testid="taskbar-menu" />;
  },
}));
jest.mock('../components/desktop/WindowStateShelf', () => ({
  MinimizedWindowShelf: function MockMinimizedWindowShelf() {
    return <div data-testid="minimized-shelf" />;
  },
  ClosedWindowShelf: function MockClosedWindowShelf() {
    return <div data-testid="closed-shelf" />;
  },
}));
jest.mock('../hooks/usePersistentState', () => ({
  useSnapSetting: () => [false],
  useSnapGridSetting: () => [[8, 8]],
}));
jest.mock('../hooks/useSettings', () => ({
  useSettings: () => ({
    density: 'comfortable',
    fontScale: 1,
    largeHitAreas: false,
    desktopTheme: { accent: '#1793d1' },
  }),
}));
jest.mock('../components/menu/WhiskerMenu', () => ({
  __esModule: true,
  default: function MockWhiskerMenu() {
    return <button type="button">Launcher</button>;
  },
}));
jest.mock('../components/util-components/clock', () => ({
  __esModule: true,
  default: function MockClock() {
    return <div data-testid="clock" />;
  },
}));
jest.mock('../components/util-components/status', () => ({
  __esModule: true,
  default: function MockStatus() {
    return <div data-testid="status" />;
  },
}));
jest.mock('../components/ui/QuickSettings', () => ({
  __esModule: true,
  default: function MockQuickSettings(props: { open: boolean }) {
    return <div data-testid="quick-settings">{String(props.open)}</div>;
  },
}));
jest.mock('../components/ui/PerformanceGraph', () => ({
  __esModule: true,
  default: function MockPerformanceGraph() {
    return <div data-testid="performance-graph" />;
  },
}));
jest.mock('../components/panel/WorkspaceSwitcher', () => ({
  __esModule: true,
  default: function MockWorkspaceSwitcher() {
    return <div data-testid="workspace-switcher" />;
  },
}));

const setupMatchMedia = () => {
  const matchMediaMock = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  });
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: matchMediaMock,
  });
  return matchMediaMock;
};

describe('desktop accessibility landmarks', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    setupMatchMedia();
  });

  afterEach(() => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      const globalWindow = window as typeof window & { matchMedia?: typeof window.matchMedia };
      delete globalWindow.matchMedia;
    }
  });

  it('exposes focusable desktop and window area targets', () => {
    const { container } = render(
      <Desktop
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
      />,
    );

    const desktop = container.querySelector('#desktop');
    const windowArea = container.querySelector('#window-area');

    expect(desktop).not.toBeNull();
    expect(desktop?.tabIndex).toBe(-1);
    expect(windowArea).not.toBeNull();
    expect(windowArea?.tabIndex).toBe(-1);
  });

  it('renders the dock as a focusable navigation landmark', () => {
    const { container } = render(<Navbar lockScreen={() => {}} shutDown={() => {}} />);
    const dock = container.querySelector('#desktop-dock');

    expect(dock).not.toBeNull();
    expect(dock?.tagName).toBe('NAV');
    expect(dock?.tabIndex).toBe(-1);
  });
});
