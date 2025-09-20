import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Window from '../components/base/window';

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

describe('Window freeze lifecycle', () => {
  it('notifies registered handlers on minimize and resume', () => {
    const freeze = jest.fn();
    const resume = jest.fn();
    const screen = jest.fn((addFolder, openApp, manager) => {
      manager.registerLifecycle({ freeze, resume });
      return <div>content</div>;
    });

    const { rerender } = render(
      <Window
        id="test-window"
        title="Test"
        screen={screen}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        minimized={false}
      />,
    );

    rerender(
      <Window
        id="test-window"
        title="Test"
        screen={screen}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        minimized
      />,
    );

    expect(freeze).toHaveBeenCalled();

    rerender(
      <Window
        id="test-window"
        title="Test"
        screen={screen}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        hideSideBar={() => {}}
        openApp={() => {}}
        minimized={false}
      />,
    );

    expect(resume).toHaveBeenCalled();
  });

  it('pauses requestAnimationFrame loops when minimized without handlers', () => {
    jest.useFakeTimers();
    try {
      const managerBefore = (window as any).__desktopRafManager__;
      const originalNativeRequest = managerBefore?.nativeRequest;
      const originalNativeCancel = managerBefore?.nativeCancel;
      const originalRaf = window.requestAnimationFrame;
      const originalCancel = window.cancelAnimationFrame;
      window.requestAnimationFrame = ((cb: FrameRequestCallback) =>
        setTimeout(() => cb(Date.now()), 16)) as any;
      window.cancelAnimationFrame = ((handle: number) => clearTimeout(handle)) as any;

      let frames = 0;
      let started = false;
      const loop = () => {
        frames += 1;
        requestAnimationFrame(loop);
      };
      const screen = jest.fn(() => {
        if (!started) {
          started = true;
          requestAnimationFrame(loop);
        }
        return <div>loop</div>;
      });

      const { rerender } = render(
        <Window
          id="test-window"
          title="Test"
          screen={screen}
          focus={() => {}}
          hasMinimised={() => {}}
          closed={() => {}}
          hideSideBar={() => {}}
          openApp={() => {}}
          minimized={false}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(50);
      });

      expect(frames).toBeGreaterThan(0);
      const beforeFreeze = frames;
      const manager = (window as any).__desktopRafManager__;
      expect(manager).toBeDefined();
      expect(manager.frozen.has('test-window')).toBe(false);

      rerender(
        <Window
          id="test-window"
          title="Test"
          screen={screen}
          focus={() => {}}
          hasMinimised={() => {}}
          closed={() => {}}
          hideSideBar={() => {}}
          openApp={() => {}}
          minimized
        />,
      );

      const frozenManager = (window as any).__desktopRafManager__;
      expect(frozenManager.frozen.has('test-window')).toBe(true);

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(frames).toBe(beforeFreeze);

      rerender(
        <Window
          id="test-window"
          title="Test"
          screen={screen}
          focus={() => {}}
          hasMinimised={() => {}}
          closed={() => {}}
          hideSideBar={() => {}}
          openApp={() => {}}
          minimized={false}
        />,
      );

      act(() => {
        jest.advanceTimersByTime(100);
      });

      expect(frames).toBeGreaterThan(beforeFreeze);
      if (managerBefore) {
        window.requestAnimationFrame = originalNativeRequest ?? originalRaf;
        window.cancelAnimationFrame = originalNativeCancel ?? originalCancel;
      } else {
        window.requestAnimationFrame = originalRaf;
        window.cancelAnimationFrame = originalCancel;
      }
    } finally {
      jest.useRealTimers();
    }
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
