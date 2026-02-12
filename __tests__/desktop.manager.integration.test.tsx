import React, { PropsWithChildren, useEffect } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));

jest.mock('../components/util-components/background-image', () => () => (
  <div data-testid="background" />
));

jest.mock('../components/base/window', () => ({
  __esModule: true,
  default: ({ id, children }: any) => (
    <div data-testid="window" id={id}>
      {children}
    </div>
  ),
  WindowTopBar: ({ title }: { title: string }) => (
    <div data-testid="window-top-bar" role="presentation">
      {title}
    </div>
  ),
  WindowEditButtons: ({
    minimize,
    maximize,
    close,
    id,
    allowMaximize = true,
    isMaximised = false,
  }: {
    minimize?: () => void;
    maximize?: () => void;
    close?: () => void;
    id?: string;
    allowMaximize?: boolean;
    isMaximised?: boolean;
  }) => (
    <div data-testid={`window-controls-${id ?? 'unknown'}`}>
      <button type="button" aria-label="Window minimize" onClick={minimize}>
        minimize
      </button>
      {allowMaximize && (
        <button
          type="button"
          aria-label={isMaximised ? 'Window restore' : 'Window maximize'}
          onClick={maximize}
        >
          maximize
        </button>
      )}
      <button type="button" aria-label="Window close" onClick={close}>
        close
      </button>
    </div>
  ),
}));

jest.mock('../components/base/SystemOverlayWindow', () => ({
  __esModule: true,
  default: ({
    children,
    onMinimize,
    onClose,
    title,
  }: PropsWithChildren<{ onMinimize?: () => void; onClose?: () => void; title?: string }>) => (
    <div data-testid="system-overlay-window">
      <header>
        <button
          type="button"
          aria-label={`Minimize ${title ?? 'overlay'}`}
          onClick={onMinimize}
        >
          Minimize
        </button>
        <button
          type="button"
          aria-label={`Close ${title ?? 'overlay'}`}
          onClick={onClose}
        >
          Close
        </button>
      </header>
      <div>{children}</div>
    </div>
  ),
}));

jest.mock('../components/base/ubuntu_app', () => () => <div data-testid="ubuntu-app" />);
jest.mock('../components/screen/all-applications', () => () => <div data-testid="all-apps" />);
jest.mock('../components/screen/shortcut-selector', () => () => <div data-testid="shortcut-selector" />);
jest.mock('../components/screen/window-switcher', () => () => <div data-testid="window-switcher" />);
jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="desktop-menu" />,
}));
jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: () => <div data-testid="default-menu" />,
}));
jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="app-menu" />,
}));
jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="taskbar-menu" />,
}));
jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

const COMMAND_OVERLAY_ID = 'overlay-command-palette';

interface TestManagerProviderProps {
  onWorkspaceState: (detail: any) => void;
}

function TestManagerProvider({ children, onWorkspaceState }: PropsWithChildren<TestManagerProviderProps>) {
  useEffect(() => {
    const handler = (event: Event) => {
      const custom = event as CustomEvent;
      onWorkspaceState(custom.detail);
    };
    window.addEventListener('workspace-state', handler);
    return () => {
      window.removeEventListener('workspace-state', handler);
    };
  }, [onWorkspaceState]);
  return <>{children}</>;
}

type RenderResult = {
  desktopRef: React.RefObject<Desktop>;
  workspaceEvents: any[];
  unmount: () => void;
};

function renderDesktopWithManager(): RenderResult {
  const desktopRef = React.createRef<Desktop>();
  const workspaceEvents: any[] = [];
  const handleWorkspaceState = (detail: any) => {
    workspaceEvents.push(detail);
  };

  const { unmount } = render(
    <TestManagerProvider onWorkspaceState={handleWorkspaceState}>
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />
    </TestManagerProvider>,
  );

  return { desktopRef, workspaceEvents, unmount };
}

const findLatestWorkspaceEventFor = (events: any[], appId: string) => {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const detail = events[index];
    if (detail?.runningApps?.some((app: any) => app.id === appId)) {
      return detail;
    }
  }
  return null;
};

async function openAppById(ref: React.RefObject<Desktop>, appId: string) {
  await act(async () => {
    ref.current?.openApp(appId);
    await new Promise((resolve) => setTimeout(resolve, 250));
  });

  await waitFor(() => {
    expect(ref.current?.state.closed_windows?.[appId]).toBe(false);
  });
}

describe('Desktop manager integration', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeAll(() => {
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0),
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: (id: number) => clearTimeout(id),
    });
  });

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    const matchMediaMock = jest.fn().mockReturnValue({
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error cleanup mock matchMedia
      delete window.matchMedia;
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('toggles window minimization via taskbar commands and updates workspace state', async () => {
    const { desktopRef, workspaceEvents, unmount } = renderDesktopWithManager();

    await waitFor(() => {
      expect(desktopRef.current).not.toBeNull();
    });

    await openAppById(desktopRef, 'firefox');

    await waitFor(() => {
      const detail = findLatestWorkspaceEventFor(workspaceEvents, 'firefox');
      expect(detail?.runningApps?.find((app: any) => app.id === 'firefox')?.isMinimized).toBe(false);
    });

    workspaceEvents.length = 0;

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('taskbar-command', {
          detail: { appId: 'firefox', action: 'toggle' },
        }),
      );
    });

    await waitFor(() => {
      const detail = findLatestWorkspaceEventFor(workspaceEvents, 'firefox');
      expect(detail?.runningApps?.find((app: any) => app.id === 'firefox')?.isMinimized).toBe(true);
    });

    expect(desktopRef.current?.state.minimized_windows.firefox).toBe(true);

    workspaceEvents.length = 0;

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('taskbar-command', {
          detail: { appId: 'firefox', action: 'toggle' },
        }),
      );
    });

    await waitFor(() => {
      const detail = findLatestWorkspaceEventFor(workspaceEvents, 'firefox');
      expect(detail?.runningApps?.find((app: any) => app.id === 'firefox')?.isMinimized).toBe(false);
    });

    expect(desktopRef.current?.state.minimized_windows.firefox).toBe(false);

    unmount();
  });

  it('reorders taskbar entries when receiving a reorder command', async () => {
    const { desktopRef, unmount } = renderDesktopWithManager();

    await waitFor(() => {
      expect(desktopRef.current).not.toBeNull();
    });

    await openAppById(desktopRef, 'firefox');
    await openAppById(desktopRef, 'calculator');
    await openAppById(desktopRef, 'terminal');

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('taskbar-command', {
          detail: {
            action: 'reorder',
            order: ['terminal', 'firefox', 'calculator'],
          },
        }),
      );
    });

    expect(desktopRef.current?.state.taskbarOrder).toEqual([
      'terminal',
      'firefox',
      'calculator',
    ]);

    unmount();
  });

  it('routes overlay controls through the manager API and broadcasts workspace updates', async () => {
    const { desktopRef, workspaceEvents, unmount } = renderDesktopWithManager();

    await waitFor(() => {
      expect(desktopRef.current).not.toBeNull();
    });

    workspaceEvents.length = 0;

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('taskbar-command', {
          detail: { appId: COMMAND_OVERLAY_ID, action: 'open' },
        }),
      );
    });

    await waitFor(() => {
      expect(desktopRef.current?.state.minimized_windows?.[COMMAND_OVERLAY_ID]).toBe(false);
    });

    expect(workspaceEvents.length).toBeGreaterThan(0);
    let detail = findLatestWorkspaceEventFor(workspaceEvents, COMMAND_OVERLAY_ID);
    expect(detail?.runningApps?.find((app: any) => app.id === COMMAND_OVERLAY_ID)?.isMinimized).toBe(false);

    const minimizeButton = await waitFor(() => {
      const button = document.querySelector<HTMLButtonElement>(
        `button[aria-label="Minimize Command Palette"]`,
      );
      expect(button).not.toBeNull();
      return button;
    });

    workspaceEvents.length = 0;

    await act(async () => {
      minimizeButton?.click();
    });

    await waitFor(() => {
      expect(desktopRef.current?.state.minimized_windows?.[COMMAND_OVERLAY_ID]).toBe(true);
    });

    detail = findLatestWorkspaceEventFor(workspaceEvents, COMMAND_OVERLAY_ID);
    expect(detail?.runningApps?.find((app: any) => app.id === COMMAND_OVERLAY_ID)?.isMinimized).toBe(true);

    workspaceEvents.length = 0;

    await act(async () => {
      window.dispatchEvent(
        new CustomEvent('taskbar-command', {
          detail: { appId: COMMAND_OVERLAY_ID, action: 'toggle' },
        }),
      );
    });

    await waitFor(() => {
      expect(desktopRef.current?.state.minimized_windows?.[COMMAND_OVERLAY_ID]).toBe(false);
    });

    detail = findLatestWorkspaceEventFor(workspaceEvents, COMMAND_OVERLAY_ID);
    expect(detail?.runningApps?.find((app: any) => app.id === COMMAND_OVERLAY_ID)?.isMinimized).toBe(false);

    const closeButton = document.querySelector<HTMLButtonElement>(
      `button[aria-label="Close Command Palette"]`,
    );

    workspaceEvents.length = 0;

    await act(async () => {
      closeButton?.click();
    });

    await waitFor(() => {
      expect(workspaceEvents.length).toBeGreaterThan(0);
    });

    detail = findLatestWorkspaceEventFor(workspaceEvents, COMMAND_OVERLAY_ID);
    expect(detail).toBeNull();
    expect(desktopRef.current?.state.closed_windows?.[COMMAND_OVERLAY_ID]).not.toBe(false);

    unmount();
  });
});
