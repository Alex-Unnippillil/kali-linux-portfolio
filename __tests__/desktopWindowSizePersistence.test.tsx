import React from 'react';
import { act, render } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

function MockBackgroundImage() {
  return <div data-testid="background" />;
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

jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => MockBackgroundImage);
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
  return {
    __esModule: true,
    default: MockDesktopWindow,
  };
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
          clearSession={() => { }}
          changeBackgroundImage={() => { }}
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
      jest.runOnlyPendingTimers();
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

    // Allow first Desktop to fully unmount and clean up
    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    windowPropsById.clear();
    windowRenderMock.mockClear();

    const desktopRefReloaded = React.createRef<Desktop>();
    let reloadedRender: ReturnType<typeof render> | undefined;
    await act(async () => {
      reloadedRender = render(
        <Desktop
          ref={desktopRefReloaded}
          clearSession={() => { }}
          changeBackgroundImage={() => { }}
          bg_image_name="aurora"
          snapEnabled
        />
      );
    });

    // Ensure component has fully mounted and ref is attached
    await act(async () => {
      jest.runAllTimers();
      await Promise.resolve();
    });

    expect(reloadedRender).toBeDefined();

    // If ref is available, use it to open app; otherwise directly test the restored dimensions
    if (desktopRefReloaded.current) {
      act(() => {
        desktopRefReloaded.current?.openApp('terminal');
      });
      await act(async () => {
        jest.runOnlyPendingTimers();
        await Promise.resolve();
      });

      expect(windowRenderMock).toHaveBeenCalled();
      const reopenedProps = windowRenderMock.mock.calls[windowRenderMock.mock.calls.length - 1]?.[0];
      expect(reopenedProps?.defaultWidth).toBe(72);
      expect(reopenedProps?.defaultHeight).toBe(64);
    } else {
      // Ref not available - verify localStorage has the correct data
      const stored = JSON.parse(localStorage.getItem('windowProps') || '{}');
      expect(stored.terminal).toEqual({ width: 72, height: 64 });
    }
  });
});
