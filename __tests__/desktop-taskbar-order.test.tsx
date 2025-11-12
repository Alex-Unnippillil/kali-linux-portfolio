import React from 'react';
import { render, act } from '@testing-library/react';
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
jest.mock('../components/base/window', () => withDisplayName(() => <div data-testid="window" />, 'WindowMock'));
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

