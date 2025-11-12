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
jest.mock('../components/base/SystemOverlayWindow', () =>
  withDisplayName(() => <div data-testid="system-overlay" />, 'SystemOverlayWindowMock'),
);
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

describe('Desktop app badges', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('propagates badge metadata to running apps and clears on focus', () => {
    const { ref } = renderDesktop();
    const instance = ref.current!;

    act(() => {
      instance.setState({
        closed_windows: { terminal: false },
        minimized_windows: {},
        focused_windows: {},
      });
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-badge', {
          detail: {
            appId: 'terminal',
            badge: {
              type: 'count',
              value: 5,
              label: '5 queued jobs',
              tone: 'danger',
            },
          },
        }),
      );
    });

    expect(instance.state.appBadges.terminal).toMatchObject({
      type: 'count',
      count: 5,
      displayValue: '5',
      label: '5 queued jobs',
      tone: 'danger',
    });

    let runningApps: ReturnType<Desktop['getRunningAppSummaries']> = [];
    act(() => {
      runningApps = instance.getRunningAppSummaries();
    });
    const terminalSummary = runningApps.find((app) => app.id === 'terminal');
    expect(terminalSummary?.badge).toMatchObject({
      type: 'count',
      displayValue: '5',
      tone: 'danger',
    });

    act(() => {
      instance.focus('terminal');
    });

    expect(instance.state.appBadges.terminal).toBeUndefined();
  });

  it('normalizes progress badges and clears them when closing', async () => {
    const { ref } = renderDesktop();
    const instance = ref.current!;

    act(() => {
      instance.setState({
        closed_windows: { terminal: false },
        minimized_windows: {},
        focused_windows: {},
      });
    });

    act(() => {
      window.dispatchEvent(
        new CustomEvent('app-badge', {
          detail: {
            appId: 'terminal',
            badge: {
              type: 'ring',
              progress: 0.5,
              label: 'Sync at 50%',
              tone: 'accent',
            },
          },
        }),
      );
    });

    expect(instance.state.appBadges.terminal).toMatchObject({
      type: 'ring',
      progress: 0.5,
      displayValue: '50%',
    });

    await act(async () => {
      await instance.closeApp('terminal');
    });

    expect(instance.state.appBadges.terminal).toBeUndefined();
  });
});
