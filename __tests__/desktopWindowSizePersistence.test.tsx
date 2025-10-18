import React from 'react';
import { act, render } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => function MockBackground() {
  return <div data-testid="background" />;
});
jest.mock('../components/base/app-tile', () => function MockAppTile() {
  return <div data-testid="ubuntu-app" />;
});
jest.mock('../components/screen/all-applications', () => function MockAllApps() {
  return <div data-testid="all-apps" />;
});
jest.mock('../components/screen/shortcut-selector', () => function MockShortcutSelector() {
  return <div data-testid="shortcut-selector" />;
});
jest.mock('../components/screen/window-switcher', () => function MockWindowSwitcher() {
  return <div data-testid="window-switcher" />;
});
jest.mock('../components/context-menus/desktop-menu', () => ({
  __esModule: true,
  default: function MockDesktopMenu() {
    return <div data-testid="desktop-menu" />;
  },
}));
jest.mock('../components/context-menus/default', () => ({
  __esModule: true,
  default: function MockDefaultMenu() {
    return <div data-testid="default-menu" />;
  },
}));
jest.mock('../components/context-menus/app-menu', () => ({
  __esModule: true,
  default: function MockAppMenu() {
    return <div data-testid="app-menu" />;
  },
}));
jest.mock('../components/context-menus/taskbar-menu', () => ({
  __esModule: true,
  default: function MockTaskbarMenu() {
    return <div data-testid="taskbar-menu" />;
  },
}));
jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

const windowRenderMock = jest.fn();
const windowPropsById = new Map<string, any>();

jest.mock('../components/desktop/Window', () => {
  const React = require('react');
  const MockForwardedWindow = (props: any, _ref: any) => {
    windowRenderMock(props);
    windowPropsById.set(props.id, props);
    return null;
  };
  MockForwardedWindow.displayName = 'MockForwardedWindow';
  return React.forwardRef(MockForwardedWindow);
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
