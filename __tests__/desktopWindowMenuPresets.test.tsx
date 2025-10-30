import React from 'react';
import { act, render } from '@testing-library/react';
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

const windowRenderMock = jest.fn();
const windowPropsById = new Map<string, any>();

jest.mock('../components/desktop/Window', () => {
  const React = require('react');
  const MockDesktopWindow = React.forwardRef((props: any, _ref: any) => {
    windowRenderMock(props);
    windowPropsById.set(props.id, props);
    return null;
  });
  MockDesktopWindow.displayName = 'MockDesktopWindow';
  return MockDesktopWindow;
});

describe('Desktop window context menu presets', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    jest.useFakeTimers();
    windowRenderMock.mockClear();
    windowPropsById.clear();
    localStorage.clear();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 1920 });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 1080 });
  });

  afterEach(() => {
    jest.useRealTimers();
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: originalInnerWidth });
    Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: originalInnerHeight });
  });

  it('resizes the active window to each preset dimension', async () => {
    const desktopRef = React.createRef<Desktop>();
    await act(async () => {
      render(
        <Desktop
          ref={desktopRef}
          clearSession={() => {}}
          changeBackgroundImage={() => {}}
          bg_image_name="aurora"
          snapEnabled
        />,
      );
      await Promise.resolve();
    });

    expect(desktopRef.current).toBeDefined();

    act(() => {
      desktopRef.current?.openApp('terminal');
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    const presets = [
      { width: 960, height: 600, expected: { width: 50, height: 56 } },
      { width: 1200, height: 800, expected: { width: 63, height: 74 } },
      { width: 1440, height: 900, expected: { width: 75, height: 83 } },
    ];

    for (const preset of presets) {
      await act(async () => {
        desktopRef.current?.resizeWindowToDimensions('terminal', preset.width, preset.height);
        await Promise.resolve();
      });

      const stored = desktopRef.current?.state.window_sizes?.terminal;
      expect(stored).toEqual(preset.expected);

      const persistedRaw = localStorage.getItem('desktop_window_sizes');
      expect(persistedRaw).toBeTruthy();
      const persisted = persistedRaw ? JSON.parse(persistedRaw) : {};
      expect(persisted.terminal).toEqual(preset.expected);
    }
  });
});
