import React from 'react';
import { act, render } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => () => <div data-testid="window" />);
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

describe('Desktop workspace transitions', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;
  let pointerMediaQuery: {
    matches: boolean;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
  let motionMediaQuery: {
    matches: boolean;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
  let matchMediaMock: jest.Mock;

  beforeEach(() => {
    jest.useFakeTimers();
    originalMatchMedia = window.matchMedia;
    pointerMediaQuery = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };
    motionMediaQuery = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };
    matchMediaMock = jest.fn().mockImplementation((query: string) => {
      if (query === '(prefers-reduced-motion: reduce)') {
        return motionMediaQuery;
      }
      return pointerMediaQuery;
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaMock,
    });
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error matchMedia can be removed for cleanup
      delete window.matchMedia;
    }
    jest.restoreAllMocks();
  });

  const renderDesktop = () => {
    const desktopRef = React.createRef<Desktop>();
    const utils = render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />
    );
    return { desktop: desktopRef.current!, unmount: utils.unmount };
  };

  it('animates workspace change with exit and enter phases', () => {
    const { desktop, unmount } = renderDesktop();
    const duration = desktop.getWorkspaceTransitionDuration();

    act(() => {
      desktop.switchWorkspace(1);
    });

    expect(desktop.state.pendingWorkspace).toBe(1);
    expect(desktop.state.workspaceTransition).toEqual({ phase: 'exit', direction: 'forward' });

    act(() => {
      jest.advanceTimersByTime(duration);
    });

    expect(desktop.state.activeWorkspace).toBe(1);
    expect(desktop.state.workspaceTransition).toEqual({ phase: 'enter', direction: 'forward' });

    act(() => {
      jest.advanceTimersByTime(duration);
    });

    expect(desktop.state.workspaceTransition).toBeNull();
    unmount();
  });

  it('skips animations when reduced motion is preferred', () => {
    motionMediaQuery.matches = true;
    const { desktop, unmount } = renderDesktop();

    act(() => {
      desktop.switchWorkspace(1);
    });

    expect(desktop.state.activeWorkspace).toBe(1);
    expect(desktop.state.workspaceTransition).toBeNull();
    expect(desktop.state.pendingWorkspace).toBeNull();
    unmount();
  });
});
