import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('next/dynamic', () => () => () => null);
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
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

describe('Desktop responsive layout', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;
  let mediaQueryMock: MediaQueryList;

  beforeEach(() => {
    jest.useFakeTimers();
    originalMatchMedia = window.matchMedia;
    mediaQueryMock = {
      matches: true,
      media: '(max-width: 720px)',
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: (_handler: (this: MediaQueryList, ev: MediaQueryListEvent) => void) => {},
      removeListener: () => {},
      dispatchEvent: () => true,
    };
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue(mediaQueryMock),
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
      // @ts-expect-error cleanup
      delete window.matchMedia;
    }
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
      />,
    );
    return { desktopRef, ...utils };
  };

  it('renders the compact drawer layout on small viewports', async () => {
    const { container, desktopRef } = renderDesktop();

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    const instance = desktopRef.current!;
    await act(async () => {
      instance.openAllAppsOverlay();
      jest.runOnlyPendingTimers();
    });

    const drawer = await screen.findByRole('dialog', { name: /app drawer/i });
    expect(drawer).toHaveAttribute('aria-hidden', 'false');

    expect(container.firstChild).toMatchSnapshot('compact-layout');
  });

  it('retains window state when switching back to desktop layout', async () => {
    const { desktopRef } = renderDesktop();

    await act(async () => {
      jest.runOnlyPendingTimers();
    });

    expect(desktopRef.current).not.toBeNull();
    const instance = desktopRef.current!;
    expect(instance.state.layoutMode).toBe('compact');

    expect(instance.state.closed_windows['about']).toBe(false);

    await act(async () => {
      mediaQueryMock.matches = false;
      instance.applyLayoutMode(false);
    });

    expect(instance.state.layoutMode).toBe('desktop');
    expect(instance.state.closed_windows['about']).toBe(false);
    expect(document.documentElement.getAttribute('data-desktop-layout')).toBe('desktop');
  });
});
