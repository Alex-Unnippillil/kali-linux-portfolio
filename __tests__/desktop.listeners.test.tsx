import React from 'react';
import { render } from '@testing-library/react';
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
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
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

describe('Desktop gesture handlers', () => {
  it('releases pointer and touch references after interactions', () => {
    const desktop = new Desktop();
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
      clientY: 10,
      target: windowElement,
    } as PointerEvent);
    expect(desktop.gestureState.pointer).not.toBeNull();

    desktop.handleShellPointerMove({ pointerId: 1, clientX: 20, clientY: 25 } as PointerEvent);
    expect(desktop.gestureState.pointer?.lastX).toBe(20);

    desktop.handleShellPointerUp({ pointerId: 1, clientX: 150, clientY: 15 } as PointerEvent);
    expect(desktop.gestureState.pointer).toBeNull();

    desktop.handleShellPointerDown({
      pointerType: 'touch',
      isPrimary: true,
      pointerId: 2,
      clientX: 5,
      clientY: 5,
      target: windowElement,
    } as PointerEvent);
    desktop.handleShellPointerCancel({ pointerId: 2 } as PointerEvent);
    expect(desktop.gestureState.pointer).toBeNull();

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
    desktop.teardownGestureListeners();
    expect(removeSpy).toHaveBeenCalledWith('pointerdown', desktop.handleShellPointerDown);
    expect(desktop.gestureState.pointer).toBeNull();
    expect(desktop.gestureState.overview).toBeNull();

    document.body.innerHTML = '';
  });
});

describe('Desktop icon lock handling', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('ignores pointer down events when icons are locked', () => {
    const desktop = new Desktop();
    (desktop as unknown as { setState: React.Component['setState'] }).setState = jest.fn();
    const attachSpy = jest.spyOn(desktop, 'attachIconKeyboardListeners');

    Object.assign(desktop.state, { iconsLocked: true });

    const container = document.createElement('div');
    container.getBoundingClientRect = jest.fn(
      () => ({ left: 0, top: 0, width: 0, height: 0 } as unknown as DOMRect)
    );
    container.setPointerCapture = jest.fn();

    const event = {
      button: 0,
      currentTarget: container,
      pointerId: 1,
      clientX: 10,
      clientY: 20,
    } as unknown as PointerEvent;

    desktop.handleIconPointerDown(event, 'terminal');

    expect(container.getBoundingClientRect).not.toHaveBeenCalled();
    expect(container.setPointerCapture).not.toHaveBeenCalled();
    expect(desktop.iconDragState).toBeNull();
    expect(desktop.state.draggingIconId).toBeNull();
    expect(attachSpy).not.toHaveBeenCalled();
  });

  it('prevents drag updates while locked', () => {
    const desktop = new Desktop();
    Object.assign(desktop.state, { iconsLocked: true });
    const updateSpy = jest.spyOn(desktop, 'updateIconPosition');

    const container = document.createElement('div');
    desktop.iconDragState = {
      id: 'terminal',
      pointerId: 1,
      offsetX: 0,
      offsetY: 0,
      startX: 0,
      startY: 0,
      moved: false,
      container,
      startPosition: { x: 0, y: 0 },
      lastPosition: { x: 0, y: 0 },
    };

    const event = {
      pointerId: 1,
      clientX: 30,
      clientY: 40,
      preventDefault: jest.fn(),
    } as unknown as PointerEvent;

    desktop.handleIconPointerMove(event);

    expect(updateSpy).not.toHaveBeenCalled();
    expect(desktop.iconDragState?.moved).toBe(false);
    expect(event.preventDefault).not.toHaveBeenCalled();
  });
});
