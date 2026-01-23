import React from 'react';
import { act, render } from '@testing-library/react';
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

jest.setTimeout(15000);

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
    localStorage.clear();
    windowRenderMock.mockClear();
    windowPropsById.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
  });

  it('restores stored window dimensions after reload', async () => {
    const desktopRef = React.createRef<Desktop>();
    let initialRender: ReturnType<typeof render> | undefined;
    const flushTimers = async () => {
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };
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
    await flushTimers();
    expect(desktopRef.current).toBeDefined();
    act(() => {
      desktopRef.current?.openApp('terminal');
    });
    await flushTimers();

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
    await flushTimers();
    expect(desktopRefReloaded.current).toBeDefined();
    act(() => {
      desktopRefReloaded.current?.openApp('terminal');
    });
    await flushTimers();

    expect(windowRenderMock).toHaveBeenCalled();
    const reopenedProps = windowRenderMock.mock.calls[windowRenderMock.mock.calls.length - 1]?.[0];
    expect(reopenedProps?.defaultWidth).toBe(72);
    expect(reopenedProps?.defaultHeight).toBe(64);
  });
});
