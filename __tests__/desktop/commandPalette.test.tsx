import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Desktop } from '../../components/screen/desktop';

const withDisplayName = <P,>(component: React.ComponentType<P>, name: string) => {
  component.displayName = name;
  return component;
};

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
jest.mock('../../components/util-components/background-image', () =>
  withDisplayName(() => <div data-testid="background" />, 'BackgroundImageMock'),
);
jest.mock('../../components/base/window', () => {
  const WindowMock = withDisplayName(() => <div data-testid="window" />, 'WindowMock');
  const WindowTopBarMock = withDisplayName(() => <div data-testid="window-top-bar" />, 'WindowTopBarMock');
  const WindowEditButtonsMock = withDisplayName(() => <div data-testid="window-edit-buttons" />, 'WindowEditButtonsMock');
  return {
    __esModule: true,
    default: WindowMock,
    WindowTopBar: WindowTopBarMock,
    WindowEditButtons: WindowEditButtonsMock,
  };
});
jest.mock('../../components/base/ubuntu_app', () => withDisplayName(() => <div data-testid="ubuntu-app" />, 'UbuntuAppMock'));
jest.mock('../../components/screen/all-applications', () =>
  withDisplayName(() => <div data-testid="all-apps" />, 'AllAppsMock'),
);
jest.mock('../../components/screen/shortcut-selector', () =>
  withDisplayName(() => <div data-testid="shortcut-selector" />, 'ShortcutSelectorMock'),
);
jest.mock('../../components/screen/window-switcher', () =>
  withDisplayName(() => <div data-testid="window-switcher" />, 'WindowSwitcherMock'),
);
jest.mock('../../components/context-menus/desktop-menu', () => {
  const DesktopMenuMock = withDisplayName(() => <div data-testid="desktop-menu" />, 'DesktopMenuMock');
  return { __esModule: true, default: DesktopMenuMock };
});
jest.mock('../../components/context-menus/default', () => {
  const DefaultMenuMock = withDisplayName(() => <div data-testid="default-menu" />, 'DefaultMenuMock');
  return { __esModule: true, default: DefaultMenuMock };
});
jest.mock('../../components/context-menus/app-menu', () => {
  const AppMenuMock = withDisplayName(() => <div data-testid="app-menu" />, 'AppMenuMock');
  return { __esModule: true, default: AppMenuMock };
});
jest.mock('../../components/context-menus/taskbar-menu', () => {
  const TaskbarMenuMock = withDisplayName(() => <div data-testid="taskbar-menu" />, 'TaskbarMenuMock');
  return { __esModule: true, default: TaskbarMenuMock };
});
jest.mock('../../components/context-menus/window-menu', () => {
  const WindowMenuMock = withDisplayName(() => <div data-testid="window-menu" />, 'WindowMenuMock');
  return { __esModule: true, default: WindowMenuMock };
});
jest.mock('../../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

describe('Desktop command palette integration', () => {
  const COMMAND_ID = 'overlay-command-palette';
  let originalMatchMedia: typeof window.matchMedia | undefined;
  let matchMediaMock: jest.Mock;
  let originalPlatform: PropertyDescriptor | undefined;

  beforeAll(() => {
    originalPlatform = Object.getOwnPropertyDescriptor(window.navigator, 'platform');
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: 'Win32',
    });
    Object.defineProperty(window, 'requestAnimationFrame', {
      configurable: true,
      value: (cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 0),
    });
    Object.defineProperty(window, 'cancelAnimationFrame', {
      configurable: true,
      value: (id: number) => clearTimeout(id),
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: jest.fn(),
    });
  });

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    matchMediaMock = jest.fn().mockReturnValue({
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    });
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaMock,
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
      // @ts-expect-error clean up mock
      delete window.matchMedia;
    }
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  afterAll(() => {
    if (originalPlatform) {
      Object.defineProperty(window.navigator, 'platform', originalPlatform);
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

  it('opens and closes the command palette with Ctrl+Space', async () => {
    const { desktopRef } = renderDesktop();
    await waitFor(() => {
      expect(desktopRef.current).not.toBeNull();
    });

    const instance = desktopRef.current!;
    expect(instance.state.overlayWindows[COMMAND_ID]?.open).toBeFalsy();

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space', ctrlKey: true });
    });

    await waitFor(() => {
      expect(instance.state.overlayWindows[COMMAND_ID]?.open).toBe(true);
    });

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space', ctrlKey: true });
    });

    await waitFor(() => {
      expect(instance.state.overlayWindows[COMMAND_ID]?.open).toBe(false);
    });
  });

  it('filters command palette results by query', async () => {
    renderDesktop();

    act(() => {
      fireEvent.keyDown(document, { key: ' ', code: 'Space', ctrlKey: true });
    });

    const searchInput = await screen.findByRole('textbox', { name: /search commands/i });
    act(() => {
      fireEvent.change(searchInput, { target: { value: 'terminal' } });
    });

    const optionElements = await screen.findAllByRole('option');
    const labels = optionElements.map((option) => option.textContent?.trim() ?? '');
    expect(labels[0]).toMatch(/^Terminal/i);

    expect(screen.queryByRole('option', { name: /open settings/i })).not.toBeInTheDocument();
  });

  it('launches the selected app from the command palette', async () => {
    const { desktopRef } = renderDesktop();

    await waitFor(() => {
      expect(desktopRef.current).not.toBeNull();
    });
    const instance = desktopRef.current!;
    const openAppSpy = jest.spyOn(instance, 'openApp');
    openAppSpy.mockClear();

    try {
      act(() => {
        fireEvent.keyDown(document, { key: ' ', code: 'Space', ctrlKey: true });
      });

      const searchInput = await screen.findByRole('textbox', { name: /search commands/i });
      act(() => {
        fireEvent.change(searchInput, { target: { value: 'terminal' } });
      });

      act(() => {
        fireEvent.keyDown(searchInput, { key: 'Enter' });
      });

      await waitFor(() => {
        expect(openAppSpy).toHaveBeenCalledWith('terminal');
      });

      await waitFor(() => {
        expect(desktopRef.current?.state.overlayWindows[COMMAND_ID]?.open).toBe(false);
      });
    } finally {
      openAppSpy.mockRestore();
    }
  });
});
