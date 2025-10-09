import React from 'react';
import { render, waitFor, act } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';
import apps from '../apps.config';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => () => <div data-testid="window" />);
jest.mock('../components/base/ubuntu_app', () => (props: any) => {
  const { draggable } = props;
  return <div data-testid="ubuntu-app" draggable={draggable} />;
});
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

describe('Desktop launcher drop integration', () => {
  const targetAppId = 'qr';
  let originalDesktopShortcut: boolean;
  let matchMediaOriginal: typeof window.matchMedia | undefined;

  beforeEach(() => {
    matchMediaOriginal = window.matchMedia;
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: jest.fn().mockReturnValue({
        matches: false,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
      }),
    });

    const app = apps.find((item) => item.id === targetAppId);
    if (!app) {
      throw new Error('Target app not found in configuration');
    }
    originalDesktopShortcut = app.desktop_shortcut;
    app.desktop_shortcut = false;
    localStorage.removeItem('app_shortcuts');
  });

  afterEach(() => {
    const app = apps.find((item) => item.id === targetAppId);
    if (app) {
      app.desktop_shortcut = originalDesktopShortcut;
    }
    localStorage.removeItem('app_shortcuts');

    if (matchMediaOriginal) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: matchMediaOriginal,
      });
    } else {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-expect-error allow cleanup in test environment
      delete window.matchMedia;
    }
  });

  it('creates a desktop shortcut at the dropped location', async () => {
    const desktopRef = React.createRef<Desktop>();
    render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />
    );

    await waitFor(() => {
      const instance = desktopRef.current;
      expect(instance).toBeTruthy();
      const disabledApps = instance?.state.disabled_apps || {};
      expect(Object.keys(disabledApps).length).toBeGreaterThan(0);
    });

    const instance = desktopRef.current!;
    await act(async () => {
      instance.setState({ allAppsView: true });
    });

    const desktopElement = instance.desktopRef.current!;
    jest.spyOn(desktopElement, 'getBoundingClientRect').mockReturnValue({
      left: 10,
      top: 20,
      right: 810,
      bottom: 620,
      width: 800,
      height: 600,
      x: 10,
      y: 20,
      toJSON: () => {},
    } as DOMRect);

    const rawX = 240;
    const rawY = 180;
    const offsetX = 30;
    const offsetY = 26;
    const snapped = instance.snapIconPosition(rawX, rawY);
    const expectedPosition = instance.clampIconPosition(snapped.x, snapped.y);

    const dropEvent = new CustomEvent('launcher-app-drop', {
      detail: {
        appId: targetAppId,
        clientX: 10 + offsetX + rawX,
        clientY: 20 + offsetY + rawY,
        offsetX,
        offsetY,
        shouldClose: true,
      },
    });

    await act(async () => {
      window.dispatchEvent(dropEvent);
    });

    await waitFor(() => {
      const { desktop_apps: desktopApps, allAppsView } = instance.state;
      expect(desktopApps).toContain(targetAppId);
      expect(allAppsView).toBe(false);
    });

    const position = instance.state.desktop_icon_positions[targetAppId];
    expect(position).toEqual(expectedPosition);
  });
});

