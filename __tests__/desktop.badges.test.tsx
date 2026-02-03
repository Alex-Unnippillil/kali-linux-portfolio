import React from 'react';
import { render, act } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => () => <div data-testid="window" />);
jest.mock('../components/base/ubuntu_app', () => () => <div data-testid="ubuntu-app" />);
jest.mock('../components/base/SystemOverlayWindow', () => () => <div data-testid="system-overlay" />);
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
