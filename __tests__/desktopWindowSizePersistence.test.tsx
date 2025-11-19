/* eslint-disable react/display-name */
import React from 'react';
import { act, render } from '@testing-library/react';
import apps from '../apps.config';
import { Desktop } from '../components/screen/desktop';

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

const getTerminalConstraints = () => {
  const config = apps.find((app) => app.id === 'terminal');
  if (!config || typeof config.minWidth !== 'number' || typeof config.minHeight !== 'number') {
    throw new Error('Terminal constraints must be defined for tests');
  }
  return { minWidth: config.minWidth, minHeight: config.minHeight };
};

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
    const { minWidth: terminalMinWidth, minHeight: terminalMinHeight } = getTerminalConstraints();
    expect(initialProps?.minWidth).toBe(terminalMinWidth);
    expect(initialProps?.minHeight).toBe(terminalMinHeight);

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
    expect(reopenedProps?.minWidth).toBe(terminalMinWidth);
    expect(reopenedProps?.minHeight).toBe(terminalMinHeight);
  });

  it('clamps restored window dimensions to the terminal minimums', async () => {
    const { minWidth: terminalMinWidth, minHeight: terminalMinHeight } = getTerminalConstraints();
    const storedWidth = Math.max(0, terminalMinWidth - 10);
    const storedHeight = Math.max(0, terminalMinHeight - 10);
    localStorage.setItem('desktop_window_sizes', JSON.stringify({
      terminal: { width: storedWidth, height: storedHeight },
    }));

    const desktopRef = React.createRef<Desktop>();
    let renderResult: ReturnType<typeof render> | undefined;

    await act(async () => {
      renderResult = render(
        <Desktop
          ref={desktopRef}
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

    act(() => {
      desktopRef.current?.openApp('terminal');
    });

    await act(async () => {
      jest.advanceTimersByTime(200);
      await Promise.resolve();
    });

    const terminalProps = windowPropsById.get('terminal');
    expect(terminalProps).toBeDefined();
    expect(terminalProps?.minWidth).toBe(terminalMinWidth);
    expect(terminalProps?.minHeight).toBe(terminalMinHeight);
    expect(terminalProps?.defaultWidth).toBeGreaterThanOrEqual(terminalMinWidth);
    expect(terminalProps?.defaultHeight).toBeGreaterThanOrEqual(terminalMinHeight);

    renderResult?.unmount();
  });
});
