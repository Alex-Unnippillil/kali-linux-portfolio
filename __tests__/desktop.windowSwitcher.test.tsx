import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue(null) }));
jest.mock('../components/util-components/background-image', () => {
  const MockBackgroundImage = () => <div data-testid="background" />;
  MockBackgroundImage.displayName = 'MockBackgroundImage';
  return MockBackgroundImage;
});
jest.mock('../components/base/window', () => ({
  __esModule: true,
  default: Object.assign(() => <div data-testid="window" />, { displayName: 'MockWindow' }),
  WindowTopBar: Object.assign(() => <div data-testid="window-top-bar" role="presentation" />, { displayName: 'MockWindowTopBar' }),
  WindowEditButtons: Object.assign(() => (
    <div data-testid="window-edit-buttons">
      <button type="button">minimize</button>
      <button type="button">maximize</button>
      <button type="button">close</button>
    </div>
  ), { displayName: 'MockWindowEditButtons' }),
}));
jest.mock('../components/base/ubuntu_app', () => {
  const MockUbuntuApp = () => <div data-testid="ubuntu-app" />;
  MockUbuntuApp.displayName = 'MockUbuntuApp';
  return MockUbuntuApp;
});
jest.mock('../components/screen/all-applications', () => {
  const MockAllApps = () => <div data-testid="all-apps" />;
  MockAllApps.displayName = 'MockAllApplications';
  return MockAllApps;
});
jest.mock('../components/screen/shortcut-selector', () => {
  const MockShortcutSelector = () => <div data-testid="shortcut-selector" />;
  MockShortcutSelector.displayName = 'MockShortcutSelector';
  return MockShortcutSelector;
});
jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: Object.assign(() => <div data-testid="desktop-menu" />, { displayName: 'MockDesktopMenu' }),
}));
jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: Object.assign(() => <div data-testid="default-menu" />, { displayName: 'MockDefaultMenu' }),
}));
jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: Object.assign(() => <div data-testid="app-menu" />, { displayName: 'MockAppMenu' }),
}));
jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: Object.assign(() => <div data-testid="taskbar-menu" />, { displayName: 'MockTaskbarMenu' }),
}));
jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

const setupMatchMedia = () => {
  const matchMediaMock = jest.fn().mockReturnValue({
    matches: false,
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  });
  const original = window.matchMedia;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: matchMediaMock,
  });
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: original,
    });
  };
};

describe('Desktop window switcher overlay', () => {
  let restoreMatchMedia: (() => void) | undefined;

  beforeEach(() => {
    restoreMatchMedia = setupMatchMedia();
  });

  afterEach(() => {
    if (restoreMatchMedia) {
      restoreMatchMedia();
      restoreMatchMedia = undefined;
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  const renderDesktop = () => {
    const desktopRef = React.createRef<Desktop>();
    render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />,
    );
    return desktopRef;
  };

  const ensureAppOpen = async (desktopRef: React.RefObject<Desktop>, appId: string) => {
    await waitFor(() => {
      const instance = desktopRef.current;
      expect(instance).not.toBeNull();
    });
    act(() => {
      desktopRef.current?.openApp(appId);
    });
    await waitFor(() => {
      const state = desktopRef.current?.state;
      expect(state?.closed_windows?.[appId]).toBe(false);
    });
  };

  it('opens the overlay on Alt+Tab with the next app selected', async () => {
    const desktopRef = renderDesktop();

    await ensureAppOpen(desktopRef, 'terminal');
    await ensureAppOpen(desktopRef, 'calculator');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', altKey: true });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: /switch between applications/i }),
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /terminal/i })).toHaveAttribute('aria-selected', 'true');
    });

    act(() => {
      fireEvent.keyUp(document, { key: 'Alt' });
    });

    await waitFor(() => {
      expect(
        screen.queryByRole('dialog', { name: /switch between applications/i }),
      ).not.toBeInTheDocument();
    });
  });

  it('cycles through apps when Alt+Tab is pressed repeatedly', async () => {
    const desktopRef = renderDesktop();

    await ensureAppOpen(desktopRef, 'terminal');
    await ensureAppOpen(desktopRef, 'calculator');

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', altKey: true });
    });

    await waitFor(() => {
      expect(
        screen.getByRole('dialog', { name: /switch between applications/i }),
      ).toBeInTheDocument();
    });

    act(() => {
      fireEvent.keyDown(document, { key: 'Tab', altKey: true });
    });

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /about/i })).toHaveAttribute('aria-selected', 'true');
    });

    act(() => {
      fireEvent.keyUp(document, { key: 'Alt' });
    });

    await waitFor(() => {
      const state = desktopRef.current?.state;
      expect(state?.focused_windows?.about).toBe(true);
    });
  });
});
