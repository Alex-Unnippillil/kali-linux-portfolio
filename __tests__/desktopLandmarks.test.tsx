import React from 'react';
import { render, screen } from '@testing-library/react';
import { Desktop } from '../components/screen/desktop';

jest.mock('next/dynamic', () => () => () => null);
jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../components/util-components/background-image', () => () => <div data-testid="background" />);
jest.mock('../components/base/window', () => {
  const MockWindow = () => <div data-testid="window" />;
  const MockWindowTopBar = ({ title }: { title: string }) => (
    <div data-testid="window-top-bar" role="presentation">
      {title}
    </div>
  );
  const MockWindowEditButtons = ({
    minimize,
    maximize,
    close,
    allowMaximize = true,
    isMaximised,
  }: {
    minimize?: () => void;
    maximize?: () => void;
    close?: () => void;
    allowMaximize?: boolean;
    isMaximised?: boolean;
  }) => (
    <div data-testid="window-controls">
      {typeof minimize === 'function' && (
        <button type="button" aria-label="Window minimize" onClick={minimize}>
          minimize
        </button>
      )}
      {allowMaximize !== false && typeof maximize === 'function' && (
        <button
          type="button"
          aria-label={isMaximised ? 'Window restore' : 'Window maximize'}
          onClick={maximize}
        >
          maximize
        </button>
      )}
      {typeof close === 'function' && (
        <button type="button" aria-label="Window close" onClick={close}>
          close
        </button>
      )}
    </div>
  );
  return {
    __esModule: true,
    default: MockWindow,
    WindowTopBar: MockWindowTopBar,
    WindowEditButtons: MockWindowEditButtons,
  };
});
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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
