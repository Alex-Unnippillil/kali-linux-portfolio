import React from 'react';
import { render, act } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => () => <div data-testid="window" />);
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
