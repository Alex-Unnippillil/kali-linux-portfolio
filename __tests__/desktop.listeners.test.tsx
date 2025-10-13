import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { act } from 'react';
import { Desktop } from '../components/screen/desktop';

jest.mock('next/image', () => {
  function MockNextImage({ src, alt, ...rest }: any) {
    return <img src={src} alt={alt} {...rest} />;
  }
  MockNextImage.displayName = 'MockNextImage';
  return {
    __esModule: true,
    default: MockNextImage,
  };
});

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('html-to-image', () => ({ toPng: jest.fn().mockResolvedValue('data:image/png;base64,') }));
function createMockComponent(testId: string, displayName: string) {
  function MockComponent() {
    return <div data-testid={testId} />;
  }
  MockComponent.displayName = displayName;
  return MockComponent;
}

jest.mock('../components/base/window', () => {
  const MockWindow = createMockComponent('window', 'MockWindow');
  function MockWindowTopBar({ title }: { title: string }) {
    return (
      <div data-testid="window-top-bar" role="presentation">
        {title}
      </div>
    );
  }
  MockWindowTopBar.displayName = 'MockWindowTopBar';
  function MockWindowEditButtons({ minimize, maximize, close, id, allowMaximize, isMaximised }: any) {
    return (
      <div data-testid={`window-controls-${id}`}>
        <button type="button" aria-label="Window minimize" onClick={minimize}>
          minimize
        </button>
        {allowMaximize !== false && (
          <button type="button" aria-label={isMaximised ? 'Window restore' : 'Window maximize'} onClick={maximize}>
            maximize
          </button>
        )}
        <button type="button" aria-label="Window close" onClick={close}>
          close
        </button>
      </div>
    );
  }
  MockWindowEditButtons.displayName = 'MockWindowEditButtons';
  return {
    __esModule: true,
    default: MockWindow,
    WindowTopBar: MockWindowTopBar,
    WindowEditButtons: MockWindowEditButtons,
  };
});

const LAUNCHER_OVERLAY_ID = 'overlay-launcher';
const SHORTCUT_OVERLAY_ID = 'overlay-shortcut-selector';
const SWITCHER_OVERLAY_ID = 'overlay-window-switcher';

jest.mock('../components/util-components/background-image', () => {
  const MockBackgroundImage = createMockComponent('background', 'MockBackgroundImage');
  return { __esModule: true, default: MockBackgroundImage };
});

jest.mock('../components/base/ubuntu_app', () => {
  const MockUbuntuApp = createMockComponent('ubuntu-app', 'MockUbuntuApp');
  return { __esModule: true, default: MockUbuntuApp };
});

jest.mock('../components/screen/all-applications', () => {
  const MockAllApps = createMockComponent('all-apps', 'MockAllApps');
  return { __esModule: true, default: MockAllApps };
});

jest.mock('../components/screen/shortcut-selector', () => {
  const MockShortcutSelector = createMockComponent('shortcut-selector', 'MockShortcutSelector');
  return { __esModule: true, default: MockShortcutSelector };
});

jest.mock('../components/screen/window-switcher', () => {
  const MockWindowSwitcher = createMockComponent('window-switcher', 'MockWindowSwitcher');
  return { __esModule: true, default: MockWindowSwitcher };
});

jest.mock('../components/context-menus/desktop-menu', () => {
  const MockDesktopMenu = createMockComponent('desktop-menu', 'MockDesktopMenu');
  return { __esModule: true, default: MockDesktopMenu };
});

jest.mock('../components/context-menus/default', () => {
  const MockDefaultMenu = createMockComponent('default-menu', 'MockDefaultMenu');
  return { __esModule: true, default: MockDefaultMenu };
});

jest.mock('../components/context-menus/app-menu', () => {
  const MockAppMenu = createMockComponent('app-menu', 'MockAppMenu');
  return { __esModule: true, default: MockAppMenu };
});

jest.mock('../components/context-menus/taskbar-menu', () => {
  const MockTaskbarMenu = createMockComponent('taskbar-menu', 'MockTaskbarMenu');
  return { __esModule: true, default: MockTaskbarMenu };
});
jest.mock('../utils/recentStorage', () => ({ addRecentApp: jest.fn() }));

describe('Desktop event listeners', () => {
  let originalMatchMedia: typeof window.matchMedia | undefined;
  let matchMediaMock: jest.Mock;
  let mediaQueryMock: {
    matches: boolean;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    addListener: jest.Mock;
    removeListener: jest.Mock;
  };
  let openSettingsButton: HTMLButtonElement;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    mediaQueryMock = {
      matches: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      addListener: jest.fn(),
      removeListener: jest.fn(),
    };
    matchMediaMock = jest.fn().mockReturnValue(mediaQueryMock);
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: matchMediaMock,
    });

    openSettingsButton = document.createElement('button');
    openSettingsButton.id = 'open-settings';
    document.body.appendChild(openSettingsButton);
  });

  afterEach(() => {
    if (originalMatchMedia) {
      Object.defineProperty(window, 'matchMedia', {
        configurable: true,
        writable: true,
        value: originalMatchMedia,
      });
    } else {
      // @ts-expect-error matchMedia can be removed for the test cleanup
      delete window.matchMedia;
    }
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  it('cleans up listeners on unmount', () => {
    const winAddSpy = jest.spyOn(window, 'addEventListener');
    const winRemoveSpy = jest.spyOn(window, 'removeEventListener');
    const docAddSpy = jest.spyOn(document, 'addEventListener');
    const docRemoveSpy = jest.spyOn(document, 'removeEventListener');
    const openSettingsRemoveSpy = jest.spyOn(openSettingsButton, 'removeEventListener');

    const desktopRef = React.createRef<Desktop>();
    const { unmount } = render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />
    );

    const instance = desktopRef.current!;
    const gestureRoot = instance.desktopRef.current!;
    const gestureRemoveSpy = jest.spyOn(gestureRoot, 'removeEventListener');
    const pointerListener = instance.pointerMediaListener;

    expect(winAddSpy).toHaveBeenCalled();
    expect(docAddSpy).toHaveBeenCalled();
    expect(pointerListener).toEqual(expect.any(Function));

    unmount();

    expect(winRemoveSpy.mock.calls).toEqual(
      expect.arrayContaining([
        ['trash-change', instance.updateTrashIcon],
        ['open-app', instance.handleOpenAppEvent],
        ['resize', instance.handleViewportResize],
        ['workspace-select', instance.handleExternalWorkspaceSelect],
        ['workspace-request', instance.broadcastWorkspaceState],
        ['taskbar-command', instance.handleExternalTaskbarCommand],
      ])
    );
    expect(docRemoveSpy.mock.calls).toEqual(
      expect.arrayContaining([
        ['keydown', instance.handleGlobalShortcut],
        ['contextmenu', instance.checkContextMenu],
        ['click', instance.hideAllContextMenu],
        ['keydown', instance.handleContextKey],
      ])
    );
    expect(gestureRemoveSpy.mock.calls).toEqual(
      expect.arrayContaining([
        ['pointerdown', instance.handleShellPointerDown],
        ['pointermove', instance.handleShellPointerMove],
        ['pointerup', instance.handleShellPointerUp],
        ['pointercancel', instance.handleShellPointerCancel],
        ['touchstart', instance.handleShellTouchStart],
        ['touchmove', instance.handleShellTouchMove],
        ['touchend', instance.handleShellTouchEnd],
        ['touchcancel', instance.handleShellTouchCancel],
      ])
    );
    expect(mediaQueryMock.removeEventListener).toHaveBeenCalledWith('change', pointerListener);
    expect(openSettingsRemoveSpy).toHaveBeenCalledWith('click', instance.openSettingsClickHandler);
  });
});

describe('Desktop overlay window controls', () => {
  beforeEach(() => {
    jest.useRealTimers();
  });

  it('updates launcher overlay flags when window controls are used', () => {
    jest.useFakeTimers();
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

    const instance = desktopRef.current!;
    act(() => {
      instance.openAllAppsOverlay();
    });

    act(() => {
      instance.toggleOverlayMinimize(LAUNCHER_OVERLAY_ID);
    });
    expect(instance.state.minimized_windows[LAUNCHER_OVERLAY_ID]).toBe(true);

    act(() => {
      instance.toggleOverlayMinimize(LAUNCHER_OVERLAY_ID);
    });
    expect(instance.state.minimized_windows[LAUNCHER_OVERLAY_ID]).toBe(false);

    act(() => {
      instance.openOverlay(LAUNCHER_OVERLAY_ID, { maximized: true });
    });
    expect(instance.state.overlayWindows?.[LAUNCHER_OVERLAY_ID]?.maximized).toBe(true);

    act(() => {
      instance.closeOverlay(LAUNCHER_OVERLAY_ID);
    });
    expect(instance.state.overlayWindows?.[LAUNCHER_OVERLAY_ID]?.open).toBe(false);

    act(() => {
      jest.runAllTimers();
    });
    expect(instance.state.overlayWindows?.[LAUNCHER_OVERLAY_ID]?.transitionState).toBe('exiting');
    jest.useRealTimers();
  });

  it('tracks shortcut selector overlay state changes from window controls', () => {
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

    const instance = desktopRef.current!;
    act(() => {
      instance.openShortcutSelector();
    });

    act(() => {
      instance.toggleOverlayMinimize(SHORTCUT_OVERLAY_ID);
    });
    expect(instance.state.minimized_windows[SHORTCUT_OVERLAY_ID]).toBe(true);

    act(() => {
      instance.toggleOverlayMinimize(SHORTCUT_OVERLAY_ID);
    });
    expect(instance.state.minimized_windows[SHORTCUT_OVERLAY_ID]).toBe(false);

    act(() => {
      instance.closeOverlay(SHORTCUT_OVERLAY_ID);
    });
    expect(instance.state.overlayWindows?.[SHORTCUT_OVERLAY_ID]?.open).toBe(false);
  });

  it('updates window switcher overlay flags through controls', () => {
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

    const instance = desktopRef.current!;
    act(() => {
      instance.openOverlay(SWITCHER_OVERLAY_ID);
    });

    act(() => {
      instance.toggleOverlayMinimize(SWITCHER_OVERLAY_ID);
    });
    expect(instance.state.minimized_windows[SWITCHER_OVERLAY_ID]).toBe(true);

    act(() => {
      instance.toggleOverlayMinimize(SWITCHER_OVERLAY_ID);
    });
    expect(instance.state.minimized_windows[SWITCHER_OVERLAY_ID]).toBe(false);

    act(() => {
      instance.closeOverlay(SWITCHER_OVERLAY_ID);
    });
    expect(instance.state.overlayWindows?.[SWITCHER_OVERLAY_ID]?.open).toBe(false);
  });
});

describe('Desktop window state transitions', () => {
  it('reopens a closed minimized window in a visible state', async () => {
    jest.useFakeTimers();
    try {
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

      const instance = desktopRef.current!;
      act(() => {
        jest.runAllTimers();
      });

      expect(instance.state.closed_windows.about).toBe(false);

      act(() => {
        instance.hasMinimised('about');
      });
      expect(instance.state.minimized_windows.about).toBe(true);

      await act(async () => {
        await instance.closeApp('about');
      });

      expect(instance.state.closed_windows.about).toBe(true);
      expect(instance.state.minimized_windows.about).toBe(false);

      act(() => {
        instance.openApp('about');
      });
      act(() => {
        jest.runAllTimers();
      });

      expect(instance.state.closed_windows.about).toBe(false);
      expect(instance.state.minimized_windows.about).toBe(false);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('Desktop gesture handlers', () => {
  it('releases pointer and touch references after interactions', () => {
    const desktop = new Desktop({});
    desktop.dispatchWindowCommand = jest.fn().mockReturnValue(false);
    desktop.focus = jest.fn();
    // prevent state updates from throwing warnings
    desktop.setState = jest.fn();
    desktop.setWorkspaceState = jest.fn();

    const node = document.createElement('div');
    desktop.desktopRef.current = node;
    const removeSpy = jest.spyOn(node, 'removeEventListener');
    const addSpy = jest.spyOn(node, 'addEventListener');

    desktop.setupGestureListeners();
    expect(addSpy).toHaveBeenCalled();

    const windowElement = document.createElement('div');
    windowElement.id = 'win-gesture';
    windowElement.classList.add('opened-window');
    document.body.appendChild(windowElement);

    desktop.handleShellPointerDown({
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 1,
      clientX: 10,
      clientY: 150,
      target: windowElement,
    } as PointerEvent);
    expect(desktop.gestureState.pointer).not.toBeNull();
    expect(desktop.gestureState.topEdge).toBeNull();

    desktop.handleShellPointerMove({ pointerId: 1, clientX: 20, clientY: 25 } as PointerEvent);
    expect(desktop.gestureState.pointer?.lastX).toBe(20);

    desktop.handleShellPointerUp({ pointerId: 1, clientX: 150, clientY: 15 } as PointerEvent);
    expect(desktop.gestureState.pointer).toBeNull();
    expect(desktop.gestureState.topEdge).toBeNull();

    desktop.handleShellPointerDown({
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 2,
      clientX: 5,
      clientY: 5,
      target: windowElement,
    } as PointerEvent);
    expect(desktop.gestureState.topEdge).not.toBeNull();
    desktop.handleShellPointerCancel({ pointerId: 2 } as PointerEvent);
    expect(desktop.gestureState.pointer).toBeNull();
    expect(desktop.gestureState.topEdge).toBeNull();

    const touches = [
      { clientX: 0, clientY: 100 },
      { clientX: 10, clientY: 110 },
      { clientX: 20, clientY: 120 },
    ];
    desktop.handleShellTouchStart({ touches } as TouchEvent);
    expect(desktop.gestureState.overview).not.toBeNull();

    const movedTouches = [
      { clientX: 0, clientY: 60 },
      { clientX: 10, clientY: 70 },
      { clientX: 20, clientY: 80 },
    ];
    desktop.handleShellTouchMove({ touches: movedTouches } as TouchEvent);
    desktop.handleShellTouchEnd({ touches: [] } as TouchEvent);
    expect(desktop.gestureState.overview).toBeNull();

    desktop.handleShellTouchStart({ touches } as TouchEvent);
    desktop.handleShellTouchCancel();
    expect(desktop.gestureState.overview).toBeNull();

    desktop.gestureState.pointer = { pointerId: 3 } as any;
    desktop.gestureState.overview = { startY: 10 } as any;
    desktop.gestureState.topEdge = { pointerId: 4 } as any;
    desktop.teardownGestureListeners();
    expect(removeSpy).toHaveBeenCalledWith('pointerdown', desktop.handleShellPointerDown);
    expect(desktop.gestureState.pointer).toBeNull();
    expect(desktop.gestureState.overview).toBeNull();
    expect(desktop.gestureState.topEdge).toBeNull();

    document.body.innerHTML = '';
  });

  it('opens the window switcher once when swiping down from the top edge', () => {
    const desktop = new Desktop({});
    desktop.setState = jest.fn();
    const switcherSpy = jest
      .spyOn(desktop, 'openWindowSwitcher')
      .mockImplementation(() => {});

    try {
      desktop.handleShellPointerDown({
        pointerType: 'touch',
        isPrimary: true,
        pointerId: 10,
        clientX: 40,
        clientY: 12,
      } as PointerEvent);
      expect(desktop.gestureState.topEdge).not.toBeNull();

      desktop.handleShellPointerMove({
        pointerType: 'touch',
        pointerId: 10,
        clientX: 45,
        clientY: 180,
      } as PointerEvent);
      expect(switcherSpy).toHaveBeenCalledTimes(1);

      desktop.handleShellPointerMove({
        pointerType: 'touch',
        pointerId: 10,
        clientX: 46,
        clientY: 240,
      } as PointerEvent);
      expect(switcherSpy).toHaveBeenCalledTimes(1);

      desktop.handleShellPointerUp({
        pointerType: 'touch',
        pointerId: 10,
        clientX: 46,
        clientY: 260,
      } as PointerEvent);
      expect(desktop.gestureState.topEdge).toBeNull();

      switcherSpy.mockClear();
      desktop.state.overlayWindows[LAUNCHER_OVERLAY_ID] = {
        ...desktop.state.overlayWindows[LAUNCHER_OVERLAY_ID],
        open: true,
      } as any;

      desktop.handleShellPointerDown({
        pointerType: 'touch',
        isPrimary: true,
        pointerId: 11,
        clientX: 50,
        clientY: 8,
      } as PointerEvent);
      desktop.handleShellPointerMove({
        pointerType: 'touch',
        pointerId: 11,
        clientX: 54,
        clientY: 200,
      } as PointerEvent);
      expect(switcherSpy).not.toHaveBeenCalled();

      desktop.handleShellPointerUp({
        pointerType: 'touch',
        pointerId: 11,
        clientX: 54,
        clientY: 220,
      } as PointerEvent);
      expect(desktop.gestureState.topEdge).toBeNull();
    } finally {
      switcherSpy.mockRestore();
    }
  });
});
