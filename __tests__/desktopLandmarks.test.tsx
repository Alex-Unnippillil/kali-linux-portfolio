import React from 'react';
import { render, screen } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('next/dynamic', () => function MockNextDynamic() {
  return () => null;
});
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => function MockBackground() {
  return <div data-testid="background" />;
});
jest.mock('../components/base/window', () => function MockWindow() {
  return <div data-testid="window" />;
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

describe('Desktop landmarks', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
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
  });

  afterEach(() => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      // @ts-expect-error matchMedia can be removed for cleanup
      delete window.matchMedia;
    }
  });

  it('renders a single main landmark for the desktop shell', () => {
    render(
      <Desktop
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />
    );

    expect(screen.getAllByRole('main')).toHaveLength(1);
  });
});
