import React from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { Desktop } from '../../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

function createMockComponent(testId: string, displayName: string) {
  const MockComponent = ({ children, id }: any) => (
    <div data-testid={testId} id={id}>
      {children}
    </div>
  );
  MockComponent.displayName = displayName;
  return MockComponent;
}

jest.mock('../../components/util-components/background-image', () => {
  const MockBackground = createMockComponent('background', 'MockBackground');
  return { __esModule: true, default: MockBackground };
});

jest.mock('../../components/base/window', () => {
  const MockWindow = ({ id, children }: any) => (
    <div data-testid="window" id={id}>
      {children}
    </div>
  );
  MockWindow.displayName = 'MockWindow';
  const MockWindowTopBar = ({ title }: { title: string }) => (
    <div data-testid="window-top-bar">{title}</div>
  );
  const MockWindowEditButtons = () => (
    <div data-testid="window-edit-buttons" />
  );
  return {
    __esModule: true,
    default: MockWindow,
    WindowTopBar: MockWindowTopBar,
    WindowEditButtons: MockWindowEditButtons,
  };
});

jest.mock('../../components/base/ubuntu_app', () => {
  const MockUbuntuApp = createMockComponent('ubuntu-app', 'MockUbuntuApp');
  return { __esModule: true, default: MockUbuntuApp };
});

jest.mock('../../components/screen/all-applications', () => {
  const MockAllApps = createMockComponent('all-apps', 'MockAllApps');
  return { __esModule: true, default: MockAllApps };
});

jest.mock('../../components/screen/shortcut-selector', () => {
  const MockShortcutSelector = createMockComponent('shortcut-selector', 'MockShortcutSelector');
  return { __esModule: true, default: MockShortcutSelector };
});

jest.mock('../../components/screen/window-switcher', () => {
  const MockWindowSwitcher = createMockComponent('window-switcher', 'MockWindowSwitcher');
  return { __esModule: true, default: MockWindowSwitcher };
});

jest.mock('../../components/context-menus/desktop-menu', () => {
  const MockDesktopMenu = createMockComponent('desktop-menu', 'MockDesktopMenu');
  return { __esModule: true, default: MockDesktopMenu };
});

jest.mock('../../components/context-menus/default', () => {
  const MockDefaultMenu = createMockComponent('default-menu', 'MockDefaultMenu');
  return { __esModule: true, default: MockDefaultMenu };
});

jest.mock('../../components/context-menus/app-menu', () => {
  const MockAppMenu = createMockComponent('app-menu', 'MockAppMenu');
  return { __esModule: true, default: MockAppMenu };
});

jest.mock('../../components/context-menus/taskbar-menu', () => {
  const MockTaskbarMenu = createMockComponent('taskbar-menu', 'MockTaskbarMenu');
  return { __esModule: true, default: MockTaskbarMenu };
});

describe('Desktop workspace switching', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;
  let matchMediaMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
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
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      // @ts-expect-error cleanup for tests
      delete window.matchMedia;
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  it('keeps windows scoped to their workspace', async () => {
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

    await waitFor(() => {
      expect(desktopRef.current).not.toBeNull();
    });

    await act(async () => {
      desktopRef.current?.openApp('about');
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(desktopRef.current?.state.closed_windows?.about).toBe(false);
    });

    expect(desktopRef.current?.state.workspaces[0].windowIds).toContain('about');

    act(() => {
      desktopRef.current?.switchWorkspace(1);
    });

    await waitFor(() => {
      expect(desktopRef.current?.state.activeWorkspace).toBe(1);
    });

    expect(desktopRef.current?.state.closed_windows?.about).not.toBe(false);

    await act(async () => {
      desktopRef.current?.openApp('settings');
      jest.runAllTimers();
    });

    await waitFor(() => {
      expect(desktopRef.current?.state.closed_windows?.settings).toBe(false);
    });

    const workspaces = desktopRef.current?.state.workspaces || [];
    expect(workspaces[0].windowIds).toContain('about');
    expect(workspaces[0].windowIds).not.toContain('settings');
    expect(workspaces[1].windowIds).toContain('settings');

    const activeSummaries = desktopRef.current?.getRunningAppSummaries() || [];
    const activeIds = activeSummaries.map((entry) => entry.id);
    expect(activeIds).toContain('settings');
    expect(activeIds).not.toContain('about');

    act(() => {
      desktopRef.current?.switchWorkspace(0);
    });

    await waitFor(() => {
      expect(desktopRef.current?.state.activeWorkspace).toBe(0);
    });

    const workspace0Summaries = desktopRef.current?.getRunningAppSummaries() || [];
    const workspace0Ids = workspace0Summaries.map((entry) => entry.id);
    expect(workspace0Ids).toContain('about');
    expect(workspace0Ids).not.toContain('settings');

    await waitFor(() => {
      expect(document.getElementById('about')).not.toBeNull();
    });
    expect(document.getElementById('settings')).toBeNull();
  });
});
