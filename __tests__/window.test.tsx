import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Window from '../components/base/window';
import { Desktop } from '../components/screen/desktop';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));

describe('Window lifecycle', () => {
  it('invokes callbacks on close', () => {
    jest.useFakeTimers();
    const closed = jest.fn();
    const hideSideBar = jest.fn();

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={closed}
        hideSideBar={hideSideBar}
        openApp={() => {}}
      />
    );

    const closeButton = screen.getByRole('button', { name: /window close/i });
    fireEvent.click(closeButton);

    expect(hideSideBar).toHaveBeenCalledWith('test-window', false);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(closed).toHaveBeenCalledWith('test-window');
    jest.useRealTimers();
  });
});

describe('Window tabs', () => {
  const tabFixtures = [
    { id: 'doc-1', title: 'Doc 1', render: () => <div>Primary document</div> },
    { id: 'doc-2', title: 'Doc 2', render: () => <div>Secondary document</div> },
    { id: 'doc-3', title: 'Doc 3', render: () => <div>Tertiary document</div> },
  ];

  const baseProps = {
    id: 'tabbed-window',
    title: 'Tabbed Window',
    focus: () => {},
    hasMinimised: () => {},
    closed: () => {},
    hideSideBar: () => {},
    openApp: () => {},
    screen: () => <div>Fallback</div>,
  };

  it('supports keyboard navigation across tabs', () => {
    render(<Window {...baseProps} tabs={tabFixtures} />);

    const firstTab = screen.getByRole('tab', { name: 'Doc 1' });
    expect(firstTab).toHaveAttribute('aria-selected', 'true');

    act(() => {
      fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    });

    const secondTab = screen.getByRole('tab', { name: 'Doc 2' });
    expect(secondTab).toHaveAttribute('aria-selected', 'true');
    expect(document.activeElement).toBe(secondTab);
    expect(screen.getByText('Secondary document')).toBeInTheDocument();

    act(() => {
      fireEvent.keyDown(secondTab, { key: 'Home' });
    });

    expect(firstTab).toHaveAttribute('aria-selected', 'true');

    act(() => {
      fireEvent.keyDown(document.activeElement || firstTab, { key: 'End' });
    });

    const thirdTab = screen.getByRole('tab', { name: 'Doc 3' });
    expect(thirdTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Tertiary document')).toBeInTheDocument();
  });

  it('marks tablist as wrapped when overflow is detected', () => {
    const ref = React.createRef<Window>();
    render(<Window {...baseProps} ref={ref} tabs={tabFixtures} />);

    const tablist = screen.getByRole('tablist');
    Object.defineProperty(tablist, 'clientWidth', { configurable: true, value: 120 });
    Object.defineProperty(tablist, 'scrollWidth', { configurable: true, value: 260 });

    act(() => {
      ref.current!.updateTabOverflow();
    });

    expect(ref.current!.state.tabsWrapped).toBe(true);
    expect(tablist).toHaveAttribute('data-tabs-wrapped', 'true');
  });
});

describe('Desktop tab detachment', () => {
  it('spawns a new window for detached tabs', () => {
    const desktop = new Desktop();
    desktop.setState = (updater: any, callback?: () => void) => {
      const prev = desktop.state;
      const next = typeof updater === 'function' ? updater(prev, {}) : updater;
      desktop.state = { ...prev, ...next };
      if (callback) callback();
    };
    desktop.saveSession = jest.fn();

    desktop.state = {
      ...desktop.state,
      closed_windows: { 'test-app': false },
      favourite_apps: { 'test-app': false },
      focused_windows: { 'test-app': false },
      disabled_apps: { 'test-app': false },
      minimized_windows: { 'test-app': false },
      window_positions: {},
      detachedWindows: [],
    };
    desktop.initFavourite = { 'test-app': false };

    const app = {
      id: 'test-app',
      title: 'Tab App',
      icon: '/icon.png',
      screen: () => <div />,
      resizable: true,
      allowMaximize: true,
    };
    const tab = {
      id: 'alpha',
      title: 'Alpha doc',
      render: () => <div>Alpha</div>,
    };
    const event = { clientX: 420, clientY: 360 } as any;

    act(() => {
      desktop.handleTabDetach(app as any, tab as any, { event });
    });

    expect(desktop.state.detachedWindows).toHaveLength(1);
    const detached = desktop.state.detachedWindows[0];
    expect(detached.title).toBe('Alpha doc');
    expect(typeof detached.screen).toBe('function');
    expect(desktop.state.closed_windows[detached.id]).toBe(false);
    expect(desktop.state.window_positions[detached.id]).toEqual(
      desktop.deriveDetachedWindowPosition(event)
    );
    expect(desktop.app_stack).toContain(detached.id);
    expect(desktop.saveSession).toHaveBeenCalled();
  });
});

describe('Window snapping preview', () => {
  it('shows preview when dragged near left edge', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    // Simulate being near the left edge
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 10,
      right: 105,
      bottom: 110,
      width: 100,
      height: 100,
      x: 5,
      y: 10,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });

    expect(screen.getByTestId('snap-preview')).toBeInTheDocument();
  });

  it('hides preview when away from edge', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    // Position far from edges
    winEl.getBoundingClientRect = () => ({
      left: 200,
      top: 200,
      right: 300,
      bottom: 300,
      width: 100,
      height: 100,
      x: 200,
      y: 200,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });

    expect(screen.queryByTestId('snap-preview')).toBeNull();
  });
});

describe('Window snapping finalize and release', () => {
  it('snaps window on drag stop near left edge', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 10,
      right: 105,
      bottom: 110,
      width: 100,
      height: 100,
      x: 5,
      y: 10,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');
    expect(ref.current!.state.width).toBe(50);
    expect(ref.current!.state.height).toBe(96.3);
  });

  it('releases snap with Alt+ArrowDown restoring size', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 10,
      right: 105,
      bottom: 110,
      width: 100,
      height: 100,
      x: 5,
      y: 10,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');

    act(() => {
      ref.current!.handleKeyDown({
        key: 'ArrowDown',
        altKey: true,
        preventDefault: () => {},
        stopPropagation: () => {},
      } as any);
    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
  });

  it('releases snap when starting drag', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 10,
      right: 105,
      bottom: 110,
      width: 100,
      height: 100,
      x: 5,
      y: 10,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');

    act(() => {
      ref.current!.changeCursorToMove();
    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
  });
});

describe('Window keyboard dragging', () => {
  it('moves window using arrow keys with grabbed state', () => {
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
      />
    );

    const handle = screen.getByText('Test').parentElement!;

    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });

    const winEl = document.getElementById('test-window')!;
    expect(winEl.style.transform).toBe('translate(10px, 0px)');
    expect(handle).toHaveAttribute('aria-grabbed', 'true');

    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    expect(handle).toHaveAttribute('aria-grabbed', 'false');
  });
});

describe('Edge resistance', () => {
  it('clamps drag movement near boundaries', () => {
    const ref = React.createRef<Window>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 100,
      bottom: 100,
      width: 100,
      height: 100,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag({}, { node: winEl, x: -100, y: -50 } as any);
    });

    expect(winEl.style.transform).toBe('translate(0px, 0px)');
  });
});

describe('Window overlay inert behaviour', () => {
  it('sets and removes inert on default __next root restoring focus', () => {
    const ref = React.createRef<Window>();
    const root = document.createElement('div');
    root.id = '__next';
    document.body.appendChild(root);

    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
      />,
      { container: root }
    );

    act(() => {
      ref.current!.activateOverlay();
    });

    expect(root).toHaveAttribute('inert');

    act(() => {
      ref.current!.closeWindow();
    });

    expect(root).not.toHaveAttribute('inert');

    document.body.removeChild(root);
    document.body.removeChild(opener);
  });

  it('respects overlayRoot prop when provided', () => {
    const ref = React.createRef<Window>();
    const root = document.createElement('div');
    root.id = 'custom-root';
    document.body.appendChild(root);

    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        ref={ref}
        overlayRoot="custom-root"
      />,
      { container: root }
    );

    act(() => {
      ref.current!.activateOverlay();
    });

    expect(root).toHaveAttribute('inert');

    act(() => {
      ref.current!.closeWindow();
    });

    expect(root).not.toHaveAttribute('inert');

    document.body.removeChild(root);
    document.body.removeChild(opener);
  });
});
