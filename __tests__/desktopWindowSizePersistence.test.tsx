import React from 'react';
import { act, render } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => {
  const MockBackground = () => <div data-testid="background" />;
  MockBackground.displayName = 'MockBackground';
  return MockBackground;
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
  return {
    __esModule: true,
    default: MockDesktopMenu,
  };
});
jest.mock('../components/context-menus/default', () => {
  const MockDefaultMenu = () => <div data-testid="default-menu" />;
  MockDefaultMenu.displayName = 'MockDefaultMenu';
  return {
    __esModule: true,
    default: MockDefaultMenu,
  };
});
jest.mock('../components/context-menus/app-menu', () => {
  const MockAppMenu = () => <div data-testid="app-menu" />;
  MockAppMenu.displayName = 'MockAppMenu';
  return {
    __esModule: true,
    default: MockAppMenu,
  };
});
jest.mock('../components/context-menus/taskbar-menu', () => {
  const MockTaskbarMenu = () => <div data-testid="taskbar-menu" />;
  MockTaskbarMenu.displayName = 'MockTaskbarMenu';
  return {
    __esModule: true,
    default: MockTaskbarMenu,
  };
});
jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

jest.setTimeout(15000);

const windowRenderMock = jest.fn();
const windowPropsById = new Map<string, any>();

jest.mock('../components/desktop/Window', () => {
  const React = require('react');
  const MockWindow = React.forwardRef((props: any, _ref: any) => {
    windowRenderMock(props);
    windowPropsById.set(props.id, props);
    return null;
  });
  MockWindow.displayName = 'MockWindow';
  return MockWindow;
});

describe('Desktop window size persistence', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    localStorage.clear();
    windowRenderMock.mockClear();
    windowPropsById.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('restores stored window dimensions after reload', async () => {
    const desktopRef = React.createRef<Desktop>();
    let initialRender: ReturnType<typeof render> | undefined;
    await act(async () => {
      initialRender = render(
        <Desktop
          ref={desktopRef}
          clearSession={() => {}}
          changeBackgroundImage={() => {}}
          bg_image_name="aurora"
          snapEnabled
        />
      );
    });
    const { unmount } = initialRender!;
    await act(async () => {
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

    expect(windowRenderMock).toHaveBeenCalled();
    const initialProps = windowPropsById.get('terminal');
    expect(initialProps).toBeDefined();

    await act(async () => {
      initialProps?.onSizeChange?.(72, 64);
    });

    const storedRaw = localStorage.getItem('desktop_window_sizes');
    expect(storedRaw).toBeTruthy();
    const stored = storedRaw ? JSON.parse(storedRaw) : {};
    expect(stored.terminal).toEqual({ width: 72, height: 64 });

    unmount();
    windowPropsById.clear();
    windowRenderMock.mockClear();

    const desktopRefReloaded = React.createRef<Desktop>();
    await act(async () => {
      render(
        <Desktop
          ref={desktopRefReloaded}
          clearSession={() => {}}
          changeBackgroundImage={() => {}}
          bg_image_name="aurora"
          snapEnabled
        />
      );
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(desktopRefReloaded.current).toBeDefined();
    act(() => {
      desktopRefReloaded.current?.openApp('terminal');
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    expect(windowRenderMock).toHaveBeenCalled();
    const reopenedProps = windowRenderMock.mock.calls[windowRenderMock.mock.calls.length - 1]?.[0];
    expect(reopenedProps?.defaultWidth).toBe(72);
    expect(reopenedProps?.defaultHeight).toBe(64);
  });
});
