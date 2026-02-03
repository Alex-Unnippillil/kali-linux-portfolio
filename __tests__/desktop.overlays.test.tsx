import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.setTimeout(20000);

function MockBackgroundImage() {
  return <div data-testid="background" />;
}
function MockWindow() {
  return <div data-testid="window" />;
}
function MockWindowTopBar({ title }: { title: string }) {
  return (
    <div data-testid="window-top-bar" role="presentation">
      {title}
    </div>
  );
}
function MockWindowEditButtons({
  minimize,
  maximize,
  close,
  allowMaximize = true,
}: {
  minimize?: () => void;
  maximize?: () => void;
  close?: () => void;
  allowMaximize?: boolean;
}) {
  return (
    <div data-testid="window-edit-buttons">
      <button type="button" onClick={minimize}>
        minimize
      </button>
      {allowMaximize && (
        <button type="button" onClick={maximize}>
          maximize
        </button>
      )}
      <button type="button" onClick={close}>
        close
      </button>
    </div>
  );
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

jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => MockBackgroundImage);
jest.mock('../components/base/window', () => ({
  __esModule: true,
  default: MockWindow,
  WindowTopBar: MockWindowTopBar,
  WindowEditButtons: MockWindowEditButtons,
}));
jest.mock('../components/base/ubuntu_app', () => MockUbuntuApp);
jest.mock('../components/screen/all-applications', () => MockAllApplications);
jest.mock('../components/screen/shortcut-selector', () => MockShortcutSelector);
jest.mock('../components/screen/window-switcher', () => MockWindowSwitcher);
jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: MockDesktopMenu,
}));
jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: MockDefaultMenu,
}));
jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: MockAppMenu,
}));
jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: MockTaskbarMenu,
}));
jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

const SHORTCUT_OVERLAY_ID = 'overlay-shortcut-selector';
const LAUNCHER_OVERLAY_ID = 'overlay-launcher';

describe('Desktop overlay window integration', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;
  let matchMediaMock: jest.Mock;

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
      // @ts-expect-error matchMedia can be removed during cleanup
      delete window.matchMedia;
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('toggles overlay minimization via taskbar commands', async () => {
    const desktopRef = React.createRef<Desktop>();
    const { unmount } = render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />,
    );

    await waitFor(() => {
      const instance = desktopRef.current;
      expect(instance?.state.closed_windows?.about).toBe(true);
    }, { timeout: 15000 });

    act(() => {
      window.dispatchEvent(
        new CustomEvent('taskbar-command', {
          detail: { appId: SHORTCUT_OVERLAY_ID, action: 'toggle' },
        }),
      );
    });

    await waitFor(() => {
      const instance = desktopRef.current!;
      const overlayState = instance.state.overlayWindows[SHORTCUT_OVERLAY_ID];
      expect(overlayState?.open).toBe(true);
      expect(overlayState?.minimized).toBe(false);
    }, { timeout: 15000 });

    act(() => {
      desktopRef.current?.focus(SHORTCUT_OVERLAY_ID);
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent('taskbar-command', {
          detail: { appId: SHORTCUT_OVERLAY_ID, action: 'toggle' },
        }),
      );
    });

    await waitFor(() => {
      const instance = desktopRef.current!;
      const overlayState = instance.state.overlayWindows[SHORTCUT_OVERLAY_ID];
      expect(overlayState?.minimized).toBe(true);
    }, { timeout: 15000 });
    unmount();
  });

  it('includes overlays in workspace state broadcasts when opened', async () => {
    const desktopRef = React.createRef<Desktop>();
    const workspaceHandler = jest.fn();
    window.addEventListener('workspace-state', workspaceHandler);

    const { unmount } = render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />,
    );

    await waitFor(() => {
      const instance = desktopRef.current;
      expect(instance?.state.closed_windows?.about).toBe(true);
    }, { timeout: 15000 });

    act(() => {
      window.dispatchEvent(
        new CustomEvent('taskbar-command', {
          detail: { appId: LAUNCHER_OVERLAY_ID, action: 'open' },
        }),
      );
    });

    await waitFor(() => {
      const instance = desktopRef.current!;
      const overlayState = instance.state.overlayWindows[LAUNCHER_OVERLAY_ID];
      expect(overlayState?.open).toBe(true);
    }, { timeout: 15000 });

    act(() => {
      desktopRef.current?.openOverlay(LAUNCHER_OVERLAY_ID, { transitionState: 'entered' });
    });

    const initialCallCount = workspaceHandler.mock.calls.length;

    act(() => {
      desktopRef.current?.broadcastWorkspaceState();
    });

    await waitFor(() => {
      expect(workspaceHandler.mock.calls.length).toBeGreaterThan(initialCallCount);
    }, { timeout: 15000 });

    const recentCalls = workspaceHandler.mock.calls.slice(initialCallCount) as Array<[
      CustomEvent<{ runningApps: Array<{ id: string; title: string }> }>,
    ]>;
    const hasOverlay = recentCalls.some(([event]) =>
      event.detail.runningApps.some(
        (app) => app.id === LAUNCHER_OVERLAY_ID && app.title === 'All Applications',
      ),
    );
    expect(hasOverlay).toBe(true);

    window.removeEventListener('workspace-state', workspaceHandler);
    unmount();
  });
});
