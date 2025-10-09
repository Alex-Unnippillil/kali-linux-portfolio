import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';
import { SettingsProvider } from '../hooks/useSettings';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => () => <div data-testid="window" />);
jest.mock('../components/base/ubuntu_app', () => () => <div data-testid="ubuntu-app" />);
jest.mock('../components/screen/all-applications', () => () => <div data-testid="all-apps" />);
jest.mock('../components/screen/shortcut-selector', () => () => <div data-testid="shortcut-selector" />);
jest.mock('../components/screen/window-switcher', () => () => <div data-testid="window-switcher" />);
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
jest.mock('idb-keyval', () => ({
  get: jest.fn(() => Promise.resolve(undefined)),
  set: jest.fn(() => Promise.resolve()),
  del: jest.fn(() => Promise.resolve()),
}));

beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    }),
  });

  if (!window.fetch) {
    window.fetch = jest.fn(() => Promise.resolve({ ok: true })) as unknown as typeof fetch;
  }
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('Display settings integration', () => {
  it('shows the display settings modal when the menu item is clicked', async () => {
    const desktopRef = React.createRef<Desktop>();

    render(
      <SettingsProvider>
        <Desktop
          ref={desktopRef}
          clearSession={() => {}}
          changeBackgroundImage={() => {}}
          bg_image_name="wall-1"
          snapEnabled
        />
      </SettingsProvider>
    );

    await act(async () => {
      desktopRef.current?.setState((prevState) => ({
        context_menus: { ...prevState.context_menus, desktop: true },
      }));
    });

    const displaySettingsItem = await screen.findByRole('menuitem', { name: /display settings/i });
    fireEvent.click(displaySettingsItem);

    expect(
      await screen.findByRole('dialog', { name: /display settings/i })
    ).toBeInTheDocument();
  });
});
