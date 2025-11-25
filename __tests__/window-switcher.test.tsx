import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import WindowSwitcher from '../components/screen/window-switcher';
import { Desktop } from '../components/screen/desktop';

const createMatchMedia = (matches: Record<string, boolean> = {}) =>
  (query: string) => ({
    matches: Boolean(matches[query]),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    addListener: jest.fn(),
    removeListener: jest.fn(),
  });

if (typeof window !== 'undefined' && !('PointerEvent' in window)) {
  class MockPointerEvent extends Event {
    constructor(type: string, props: any = {}) {
      super(type, props);
      Object.entries(props || {}).forEach(([key, value]) => {
        Object.defineProperty(this, key, {
          configurable: true,
          enumerable: true,
          writable: true,
          value,
        });
      });
    }
  }
  (window as unknown as { PointerEvent: typeof Event }).PointerEvent = MockPointerEvent as any;
}

describe('WindowSwitcher mobile interactions', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMedia({
      '(pointer: coarse)': true,
      '(max-width: 900px)': true,
    }) as any;
    Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: 720 });
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
    jest.clearAllMocks();
  });

  it('renders mobile layout and supports swipe-to-dismiss', async () => {
    const onDismissWindow = jest.fn();
    const onSelect = jest.fn();
    const windows = [
      { id: 'app-1', title: 'App 1', icon: '/icons/app1.png' },
      { id: 'app-2', title: 'App 2' },
    ];

    render(
      <WindowSwitcher
        windows={windows}
        onSelect={onSelect}
        onClose={() => {}}
        onDismissWindow={onDismissWindow}
      />,
    );

    const container = screen
      .getAllByRole('presentation')
      .find((element) => element.getAttribute('data-mobile-layout') !== null);
    expect(container).toBeTruthy();
    expect(container).toHaveAttribute('data-mobile-layout', 'true');

    const option = screen.getByRole('option', { name: /app 1/i });
    await act(async () => {
      fireEvent.pointerDown(option, {
        pointerId: 1,
        pointerType: 'touch',
        buttons: 0,
        clientX: 100,
        clientY: 220,
      });
      fireEvent.pointerMove(option, {
        pointerId: 1,
        pointerType: 'touch',
        buttons: 0,
        clientX: 100,
        clientY: 80,
      });
      fireEvent.pointerUp(option, {
        pointerId: 1,
        pointerType: 'touch',
        clientX: 100,
        clientY: 80,
      });
    });

    await waitFor(() => expect(onDismissWindow).toHaveBeenCalledWith('app-1'));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('ignores short swipe gestures', async () => {
    const onDismissWindow = jest.fn();
    const windows = [{ id: 'app-1', title: 'App 1' }];

    render(
      <WindowSwitcher
        windows={windows}
        onSelect={() => {}}
        onClose={() => {}}
        onDismissWindow={onDismissWindow}
      />,
    );

    const option = screen.getByRole('option', { name: /app 1/i });
    await act(async () => {
      fireEvent.pointerDown(option, {
        pointerId: 2,
        pointerType: 'touch',
        buttons: 0,
        clientX: 80,
        clientY: 160,
      });
      fireEvent.pointerMove(option, {
        pointerId: 2,
        pointerType: 'touch',
        buttons: 0,
        clientX: 80,
        clientY: 130,
      });
      fireEvent.pointerUp(option, {
        pointerId: 2,
        pointerType: 'touch',
        clientX: 80,
        clientY: 130,
      });
    });

    expect(onDismissWindow).not.toHaveBeenCalled();
  });
});

describe('Desktop window switcher integration', () => {
  let originalMatchMedia: typeof window.matchMedia;

  beforeEach(() => {
    originalMatchMedia = window.matchMedia;
    window.matchMedia = createMatchMedia() as any;
  });

  afterEach(() => {
    window.matchMedia = originalMatchMedia;
  });

  it('minimizes overlapping windows when selecting from the switcher', () => {
    const desktopRef = React.createRef<Desktop>();
    render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />,
    );

    const instance = desktopRef.current!;
    act(() => {
      instance.currentPointerIsCoarse = true;
      instance.workspaceStacks[instance.state.activeWorkspace] = ['app-a', 'app-b'];
      instance.setState({
        closed_windows: { ...instance.state.closed_windows, 'app-a': false, 'app-b': false },
        minimized_windows: { ...instance.state.minimized_windows, 'app-a': false, 'app-b': false },
        switcherWindows: [],
      });
      instance.openApp = jest.fn();
      instance.closeOverlay = jest.fn();
    });

    act(() => {
      instance.selectWindow('app-b');
    });

    expect(instance.openApp).toHaveBeenCalledWith('app-b');
    expect(instance.state.minimized_windows['app-a']).toBe(true);
    expect(instance.state.minimized_windows['app-b']).toBe(false);
  });

  it('removes windows from the switcher on dismiss', () => {
    const desktopRef = React.createRef<Desktop>();
    render(
      <Desktop
        ref={desktopRef}
        clearSession={() => {}}
        changeBackgroundImage={() => {}}
        bg_image_name="aurora"
        snapEnabled
      />,
    );

    const instance = desktopRef.current!;
    act(() => {
      instance.setState({ switcherWindows: [{ id: 'app-a' }, { id: 'app-b' }] });
      instance.closeApp = jest.fn();
      instance.closeOverlay = jest.fn();
    });

    act(() => {
      instance.dismissWindowFromSwitcher('app-a');
    });
    expect(instance.closeApp).toHaveBeenCalledWith('app-a');
    expect(instance.state.switcherWindows).toEqual([{ id: 'app-b' }]);

    act(() => {
      instance.dismissWindowFromSwitcher('app-b');
    });
    expect(instance.closeOverlay).toHaveBeenCalledWith('overlay-window-switcher');
    expect(instance.state.switcherWindows).toEqual([]);
  });
});
