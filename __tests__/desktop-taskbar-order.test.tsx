import React from 'react';
import { render, act } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => {
  const MockBackgroundImage = () => <div data-testid="background" />;
  MockBackgroundImage.displayName = 'MockBackgroundImage';
  return MockBackgroundImage;
});
jest.mock('../components/base/window', () => {
  const MockWindow = () => <div data-testid="window" />;
  MockWindow.displayName = 'MockWindow';
  return MockWindow;
});
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
jest.mock('../components/screen/window-switcher', () => {
  const MockWindowSwitcher = () => <div data-testid="window-switcher" />;
  MockWindowSwitcher.displayName = 'MockWindowSwitcher';
  return MockWindowSwitcher;
});
jest.mock('../components/context-menus/desktop-menu', () => {
  const MockDesktopMenu = () => <div data-testid="desktop-menu" />;
  MockDesktopMenu.displayName = 'MockDesktopMenu';
  return { __esModule: true, default: MockDesktopMenu };
});
jest.mock('../components/context-menus/default', () => {
  const MockDefaultMenu = () => <div data-testid="default-menu" />;
  MockDefaultMenu.displayName = 'MockDefaultMenu';
  return { __esModule: true, default: MockDefaultMenu };
});
jest.mock('../components/context-menus/app-menu', () => {
  const MockAppMenu = () => <div data-testid="app-menu" />;
  MockAppMenu.displayName = 'MockAppMenu';
  return { __esModule: true, default: MockAppMenu };
});
jest.mock('../components/context-menus/taskbar-menu', () => {
  const MockTaskbarMenu = () => <div data-testid="taskbar-menu" />;
  MockTaskbarMenu.displayName = 'MockTaskbarMenu';
  return { __esModule: true, default: MockTaskbarMenu };
});
jest.mock('../utils/recentStorage', () => ({
  addRecentApp: jest.fn(),
  recordRecentAppClose: jest.fn(),
}));

const renderDesktop = () => {
  const ref = React.createRef<Desktop>();
  const utils = render(
    <Desktop
      ref={ref}
      clearSession={() => {}}
      changeBackgroundImage={() => {}}
      bg_image_name="wall-2"
      snapEnabled
    />,
  );
  return { ref, ...utils };
};

describe('Desktop taskbar order persistence', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('persists custom taskbar order and restores it on reload', async () => {
    const { ref, unmount } = renderDesktop();
    await act(async () => {
      await Promise.resolve();
    });
    const instance = ref.current!;

    act(() => {
      instance.setState({
        closed_windows: {
          firefox: false,
          calculator: false,
          terminal: false,
        },
        minimized_windows: {},
        focused_windows: {},
      });
    });

    act(() => {
      instance.broadcastWorkspaceState();
    });

    expect(instance.state.taskbarOrder).toEqual(['firefox', 'calculator', 'terminal']);

    const reorderDetail = {
      action: 'reorder' as const,
      order: ['terminal', 'firefox', 'calculator'],
    };

    act(() => {
      window.dispatchEvent(new CustomEvent('taskbar-command', { detail: reorderDetail }));
    });

    expect(instance.state.taskbarOrder).toEqual(['terminal', 'firefox', 'calculator']);
    expect(window.localStorage.getItem('taskbar-order:default')).toBe(JSON.stringify(['terminal', 'firefox', 'calculator']));

    unmount();

    const { ref: nextRef, unmount: unmountNext } = renderDesktop();
    await act(async () => {
      await Promise.resolve();
    });
    const nextInstance = nextRef.current!;

    expect(nextInstance.state.taskbarOrder).toEqual(['terminal', 'firefox', 'calculator']);

    act(() => {
      nextInstance.setState({
        closed_windows: {
          firefox: false,
          calculator: false,
          terminal: false,
        },
        minimized_windows: {},
        focused_windows: {},
      });
    });

    let runningApps: ReturnType<Desktop['getRunningAppSummaries']> = [];
    act(() => {
      runningApps = nextInstance.getRunningAppSummaries();
    });

    expect(nextInstance.state.taskbarOrder).toEqual(['terminal', 'firefox', 'calculator']);
    expect(runningApps.map((app) => app.id)).toEqual(['terminal', 'firefox', 'calculator']);

    unmountNext();
  });
});

