import React from 'react';
import { render, screen } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

const withDisplayName = <P,>(component: React.ComponentType<P>, name: string) => {
  component.displayName = name;
  return component;
};

jest.mock('next/dynamic', () => () => () => null);
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () =>
  withDisplayName(() => <div data-testid="background" />, 'BackgroundImageMock'),
);
jest.mock('../components/base/window', () => withDisplayName(() => <div data-testid="window" />, 'WindowMock'));
jest.mock('../components/base/ubuntu_app', () => withDisplayName(() => <div data-testid="ubuntu-app" />, 'UbuntuAppMock'));
jest.mock('../components/screen/all-applications', () =>
  withDisplayName(() => <div data-testid="all-apps" />, 'AllAppsMock'),
);
jest.mock('../components/screen/shortcut-selector', () =>
  withDisplayName(() => <div data-testid="shortcut-selector" />, 'ShortcutSelectorMock'),
);
jest.mock('../components/screen/window-switcher', () =>
  withDisplayName(() => <div data-testid="window-switcher" />, 'WindowSwitcherMock'),
);
jest.mock('../components/context-menus/desktop-menu', () => {
  const DesktopMenuMock = withDisplayName(() => <div data-testid="desktop-menu" />, 'DesktopMenuMock');
  return { __esModule: true, default: DesktopMenuMock };
});
jest.mock('../components/context-menus/default', () => {
  const DefaultMenuMock = withDisplayName(() => <div data-testid="default-menu" />, 'DefaultMenuMock');
  return { __esModule: true, default: DefaultMenuMock };
});
jest.mock('../components/context-menus/app-menu', () => {
  const AppMenuMock = withDisplayName(() => <div data-testid="app-menu" />, 'AppMenuMock');
  return { __esModule: true, default: AppMenuMock };
});
jest.mock('../components/context-menus/taskbar-menu', () => {
  const TaskbarMenuMock = withDisplayName(() => <div data-testid="taskbar-menu" />, 'TaskbarMenuMock');
  return { __esModule: true, default: TaskbarMenuMock };
});
jest.mock('../components/context-menus/window-menu', () => ({
  __esModule: true,
  default: () => <div data-testid="window-menu" />,
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
