import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

const withDisplayName = <P,>(component: React.ComponentType<P>, name: string) => {
  component.displayName = name;
  return component;
};

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () =>
  withDisplayName(() => <div data-testid="background" />, 'BackgroundImageMock'),
);
jest.mock('../components/base/window', () => {
  const WindowMock = withDisplayName(() => <div data-testid="window" />, 'WindowMock');
  const WindowTopBarMock = withDisplayName(({ title }: { title: string }) => (
    <div data-testid="window-top-bar" role="presentation">
      {title}
    </div>
  ), 'WindowTopBarMock');
  const WindowEditButtonsMock = withDisplayName(({ minimize, maximize, close, allowMaximize = true }: {
    minimize?: () => void;
    maximize?: () => void;
    close?: () => void;
    allowMaximize?: boolean;
  }) => (
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
  ), 'WindowEditButtonsMock');
  return {
    __esModule: true,
    default: WindowMock,
    WindowTopBar: WindowTopBarMock,
    WindowEditButtons: WindowEditButtonsMock,
  };
});
jest.mock('../components/base/ubuntu_app', () => withDisplayName(() => <div data-testid="ubuntu-app" />, 'UbuntuAppMock'));
jest.mock('../components/screen/all-applications', () =>
  withDisplayName(() => <div data-testid="all-apps" />, 'AllAppsMock'),
);
jest.mock('../components/screen/shortcut-selector', () =>
  withDisplayName(() => <div data-testid="shortcut-selector" />, 'ShortcutSelectorMock'),
);
jest.mock('../components/screen/window-switcher', () =>
  withDisplayName(() => <div data-testid="window-switcher" />, 'WindowSwitcherMock'),
);
jest.mock('../components/context-menus/desktop-menu', () => {
  const DesktopMenuMock = withDisplayName(() => <div data-testid="desktop-menu" />, 'DesktopMenuMock');
  return { __esModule: true, default: DesktopMenuMock };
});
jest.mock('../components/context-menus/default', () => {
  const DefaultMenuMock = withDisplayName(() => <div data-testid="default-menu" />, 'DefaultMenuMock');
  return { __esModule: true, default: DefaultMenuMock };
});
jest.mock('../components/context-menus/app-menu', () => {
  const AppMenuMock = withDisplayName(() => <div data-testid="app-menu" />, 'AppMenuMock');
  return { __esModule: true, default: AppMenuMock };
});
jest.mock('../components/context-menus/taskbar-menu', () => {
  const TaskbarMenuMock = withDisplayName(() => <div data-testid="taskbar-menu" />, 'TaskbarMenuMock');
  return { __esModule: true, default: TaskbarMenuMock };
});
jest.mock('../components/context-menus/window-menu', () => {
  const WindowMenuMock = withDisplayName(() => <div data-testid="window-menu" />, 'WindowMenuMock');
  return { __esModule: true, default: WindowMenuMock };
});
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
      expect(overlayState?.open).toBe(true);
      expect(overlayState?.minimized).toBe(false);
    });

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
    });
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
    });

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
    });

    act(() => {
      desktopRef.current?.openOverlay(LAUNCHER_OVERLAY_ID, { transitionState: 'entered' });
    });

    const initialCallCount = workspaceHandler.mock.calls.length;

    act(() => {
      desktopRef.current?.broadcastWorkspaceState();
    });

    await waitFor(() => {
      expect(workspaceHandler.mock.calls.length).toBeGreaterThan(initialCallCount);
    });

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
