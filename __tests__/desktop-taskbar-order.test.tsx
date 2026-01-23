import React from 'react';
import { render, act } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.setTimeout(15000);

function MockBackgroundImage() {
  return <div data-testid="background" />;
}
function MockWindow() {
  return <div data-testid="window" />;
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
jest.mock('../components/util-components/background-image', () => MockBackgroundImage);
jest.mock('../components/base/window', () => MockWindow);
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
