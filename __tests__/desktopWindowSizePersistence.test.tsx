import React from 'react';
import { act, render } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';
import { clampWindowPositionWithinViewport, measureWindowTopOffset } from '../utils/windowLayout';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
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

const windowRenderMock = jest.fn();
const windowPropsById = new Map<string, any>();

jest.mock('../components/desktop/Window', () => {
  const React = require('react');
  return React.forwardRef((props: any, _ref: any) => {
    windowRenderMock(props);
    windowPropsById.set(props.id, props);
    return null;
  });
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

  it('persists window geometry on close', async () => {
    const storeGeometry = jest.fn();
    const desktopRef = React.createRef<Desktop>();
    await act(async () => {
      render(
        <Desktop
          ref={desktopRef}
          clearSession={() => {}}
          changeBackgroundImage={() => {}}
          bg_image_name="aurora"
          snapEnabled={false}
          onStoreWindowGeometry={storeGeometry}
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      desktopRef.current?.openApp('terminal');
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    const windowProps = windowPropsById.get('terminal');
    expect(windowProps).toBeDefined();

    act(() => {
      windowProps?.onPositionChange?.(144, 200);
      windowProps?.onSizeChange?.(72, 64);
    });

    await act(async () => {
      await desktopRef.current?.closeApp('terminal');
    });

    expect(storeGeometry).toHaveBeenCalledTimes(1);
    expect(storeGeometry).toHaveBeenCalledWith('terminal', {
      x: 144,
      y: 200,
      width: 72,
      height: 64,
    });
  });

  it('applies persisted geometry when launching windows', async () => {
    const originalInnerWidth = window.innerWidth;
    const originalInnerHeight = window.innerHeight;
    Object.defineProperty(window, 'innerWidth', { value: 400, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 300, configurable: true, writable: true });

    const desktopRef = React.createRef<Desktop>();
    await act(async () => {
      render(
        <Desktop
          ref={desktopRef}
          clearSession={() => {}}
          changeBackgroundImage={() => {}}
          bg_image_name="aurora"
          snapEnabled={false}
          windowGeometry={{
            terminal: { x: 360, y: 10, width: 90, height: 60 },
          }}
          onStoreWindowGeometry={() => {}}
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      desktopRef.current?.openApp('terminal');
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    const renderedProps = windowRenderMock.mock.calls[windowRenderMock.mock.calls.length - 1]?.[0];
    const topOffset = measureWindowTopOffset();
    expect(renderedProps?.defaultWidth).toBe(90);
    expect(renderedProps?.defaultHeight).toBe(60);
    const viewportWidth = window.innerWidth;
    const expectedX = Math.max(0, viewportWidth - ((renderedProps?.defaultWidth ?? 0) / 100) * viewportWidth);
    expect(renderedProps?.initialX).toBeCloseTo(expectedX, 5);
    expect(renderedProps?.initialY).toBeCloseTo(topOffset, 3);

    Object.defineProperty(window, 'innerWidth', { value: originalInnerWidth, configurable: true, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: originalInnerHeight, configurable: true, writable: true });
  });

  it('falls back to app defaults when persisted geometry is invalid', async () => {
    const desktopRef = React.createRef<Desktop>();
    await act(async () => {
      render(
        <Desktop
          ref={desktopRef}
          clearSession={() => {}}
          changeBackgroundImage={() => {}}
          bg_image_name="aurora"
          snapEnabled={false}
          windowGeometry={{
            terminal: { x: 120, y: 180, width: Number.NaN, height: Number.NaN },
          }}
          onStoreWindowGeometry={() => {}}
        />,
      );
    });
    await act(async () => {
      await Promise.resolve();
    });

    act(() => {
      desktopRef.current?.openApp('terminal');
    });
    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    const props = windowRenderMock.mock.calls[windowRenderMock.mock.calls.length - 1]?.[0];
    expect(props?.defaultWidth).toBe(68);
    expect(props?.defaultHeight).toBe(72);
    expect(props?.initialX).toBe(120);
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const topOffset = measureWindowTopOffset();
    const widthPx = ((props?.defaultWidth ?? 0) / 100) * viewportWidth;
    const heightPx = ((props?.defaultHeight ?? 0) / 100) * viewportHeight;
    const clamped = clampWindowPositionWithinViewport(
      { x: 120, y: 180 },
      { width: widthPx, height: heightPx },
      { viewportWidth, viewportHeight, viewportLeft: 0, viewportTop: 0, topOffset },
    );
    const expectedY = clamped ? clamped.y : topOffset;
    expect(props?.initialY).toBeCloseTo(expectedY, 3);
  });
});
