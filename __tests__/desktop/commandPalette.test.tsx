import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Desktop } from '../../components/screen/desktop';

jest.setTimeout(15000);

function MockBackgroundImage() {
  return <div data-testid="background" />;
}
function MockWindow() {
  return <div data-testid="window" />;
}
function MockWindowTopBar() {
  return <div data-testid="window-top-bar" />;
}
function MockWindowEditButtons() {
  return <div data-testid="window-edit-buttons" />;
}
function MockUbuntuApp() {
  return <div data-testid="ubuntu-app" />;
}
function MockAllApplications() {
  return <div data-testid="all-apps" />;
}
function MockShortcutSelector() {
  return <div data-testid="shortcut-selector" />;
}
function MockWindowSwitcher() {
  return <div data-testid="window-switcher" />;
}
function MockDesktopMenu() {
  return <div data-testid="desktop-menu" />;
}
function MockDefaultMenu() {
  return <div data-testid="default-menu" />;
}
function MockAppMenu() {
  return <div data-testid="app-menu" />;
}
function MockTaskbarMenu() {
  return <div data-testid="taskbar-menu" />;
}

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../../components/util-components/background-image', () => MockBackgroundImage);
jest.mock('../../components/base/window', () => ({
  __esModule: true,
  default: MockWindow,
  WindowTopBar: MockWindowTopBar,
  WindowEditButtons: MockWindowEditButtons,
}));
jest.mock('../../components/base/ubuntu_app', () => MockUbuntuApp);
jest.mock('../../components/screen/all-applications', () => MockAllApplications);
jest.mock('../../components/screen/shortcut-selector', () => MockShortcutSelector);
jest.mock('../../components/screen/window-switcher', () => MockWindowSwitcher);
jest.mock('../../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: MockDesktopMenu,
}));
jest.mock('../../components/context-menus/default', () => ({
  __esModule: true,
  default: MockDefaultMenu,
}));
jest.mock('../../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: MockAppMenu,
}));
jest.mock('../../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: MockTaskbarMenu,
}));
jest.mock('../../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

describe('Desktop command palette integration', () => {
  const COMMAND_ID = 'overlay-command-palette';
  let originalMatchMedia: typeof window.matchMedia | undefined;
  let matchMediaMock: jest.Mock;
  let originalPlatform: PropertyDescriptor | undefined;

  beforeAll(() => {
    originalPlatform = Object.getOwnPropertyDescriptor(window.navigator, 'platform');
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'Win32',
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0),
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: (id: number) => clearTimeout(id),
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    matchMediaMock = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      // @ts-expect-error clean up mock
      delete window.matchMedia;
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalPlatform) {
      Object.defineProperty(window.navigator, 'platform', originalPlatform);
    }
  });

  const renderDesktop = () => {
    const desktopRef = React.createRef<Desktop>();
    const utils = render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />,
    );
    return { desktopRef, ...utils };
  };

  it('opens and closes the command palette with Ctrl+Space', async () => {
    const { desktopRef } = renderDesktop();
    await waitFor(() => {
      expect(desktopRef.current).not.toBeNull();
    });

    const instance = desktopRef.current!;
    expect(instance.state.overlayWindows[COMMAND_ID]?.open).toBeFalsy();

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space', ctrlKey: true });
    });

    await waitFor(() => {
      expect(instance.state.overlayWindows[COMMAND_ID]?.open).toBe(true);
    });

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space', ctrlKey: true });
    });

    await waitFor(() => {
      expect(instance.state.overlayWindows[COMMAND_ID]?.open).toBe(false);
    });
  });

  it('filters command palette results by query', async () => {
    renderDesktop();

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space', ctrlKey: true });
    });

    const searchInput = await screen.findByRole('textbox', { name: /search commands/i });
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'terminal' } });
    });

    const optionElements = await screen.findAllByRole('option');
    const labels = optionElements.map((option) => option.textContent?.trim() ?? '');
    expect(labels[0]).toMatch(/^Terminal/i);

    expect(screen.queryByRole('option', { name: /open settings/i })).not.toBeInTheDocument();
  });

  it('launches the selected app from the command palette', async () => {
    const { desktopRef } = renderDesktop();

    await waitFor(() => {
      expect(desktopRef.current).not.toBeNull();
    });
    const instance = desktopRef.current!;
    const openAppSpy = jest.spyOn(instance, 'openApp');
    openAppSpy.mockClear();

    try {
      act(() => {
        fireEvent.keyDown(document, { key: ' ', code: 'Space', ctrlKey: true });
      });

      const searchInput = await screen.findByRole('textbox', { name: /search commands/i });
      act(() => {
        fireEvent.change(searchInput, { target: { value: 'terminal' } });
      });

      act(() => {
        fireEvent.keyDown(searchInput, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(openAppSpy).toHaveBeenCalledWith('terminal');
      });

      await waitFor(() => {
        expect(desktopRef.current?.state.overlayWindows[COMMAND_ID]?.open).toBe(false);
      });
    } finally {
      openAppSpy.mockRestore();
    }
  });
});
