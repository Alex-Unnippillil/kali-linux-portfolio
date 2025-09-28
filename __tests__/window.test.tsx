import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Window from '../components/base/window';

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
};

beforeEach(() => {
  setViewport(1440, 900);
});

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

describe('Window snapping preview', () => {
  it('shows preview when dragged near left edge', () => {
    setViewport(1920, 1080);
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
      top: 150,
      right: 105,
      bottom: 250,
      width: 100,
      height: 100,
      x: 5,
      y: 150,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });

    const preview = screen.getByTestId('snap-preview');
    expect(preview).toBeInTheDocument();
    expect((preview as HTMLElement).style.backdropFilter).toBe('brightness(1.2)');
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

  it('shows top preview when dragged near top edge', () => {
    setViewport(1280, 720);
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
      left: 400,
      top: 5,
      right: 500,
      bottom: 105,
      width: 100,
      height: 100,
      x: 400,
      y: 5,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });

    expect(ref.current!.state.snapPosition).toBe('top');
    const preview = screen.getByTestId('snap-preview');
    expect(preview).toHaveStyle(`height: ${window.innerHeight / 2}px`);
  });
});

describe('Window snapping finalize and release', () => {
  it('snaps window on drag stop near left edge', () => {
    setViewport(1024, 768);
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
      top: 120,
      right: 105,
      bottom: 220,
      width: 100,
      height: 100,
      x: 5,
      y: 120,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    expect(ref.current!.state.snapPosition).toBe('left');
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');
    expect(ref.current!.state.width).toBeCloseTo(50);
    const expectedHeight = ((window.innerHeight - 28) / window.innerHeight) * 100;
    expect(ref.current!.state.height).toBeCloseTo(expectedHeight, 5);
    expect(winEl.style.transform).toBe('translate(0px, 0px)');
  });

  it('snaps window on drag stop near right edge on large viewport', () => {
    setViewport(1920, 1080);
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
      left: 1820,
      top: 200,
      right: 1920,
      bottom: 300,
      width: 100,
      height: 100,
      x: 1820,
      y: 200,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    expect(ref.current!.state.snapPosition).toBe('right');
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('right');
    expect(ref.current!.state.width).toBeCloseTo(50);
    const expectedHeight = ((window.innerHeight - 28) / window.innerHeight) * 100;
    expect(ref.current!.state.height).toBeCloseTo(expectedHeight, 5);
    expect(winEl.style.transform).toBe(`translate(${window.innerWidth / 2}px, 0px)`);
  });

  it('snaps window on drag stop near top edge', () => {
    setViewport(1366, 768);
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
      left: 400,
      top: 6,
      right: 500,
      bottom: 106,
      width: 100,
      height: 100,
      x: 400,
      y: 6,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    expect(ref.current!.state.snapPosition).toBe('top');
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('top');
    expect(ref.current!.state.width).toBeCloseTo(100, 2);
    expect(ref.current!.state.height).toBeCloseTo(50, 2);
    expect(winEl.style.transform).toBe('translate(0px, 0px)');
  });

  it('releases snap with Alt+ArrowDown restoring size', () => {
    setViewport(1024, 768);
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
      top: 120,
      right: 105,
      bottom: 220,
      width: 100,
      height: 100,
      x: 5,
      y: 120,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');
    const snappedHeight = ((window.innerHeight - 28) / window.innerHeight) * 100;
    expect(ref.current!.state.height).toBeCloseTo(snappedHeight, 5);

    const keyboardEvent = {
      key: 'ArrowDown',
      altKey: true,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn()
    } as unknown as KeyboardEvent;

    act(() => {
      ref.current!.handleKeyDown({
        key: 'ArrowDown',
        altKey: true,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn()
      } as any);


    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
  });

  it('releases snap when starting drag', () => {
    setViewport(1440, 900);
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
      top: 150,
      right: 105,
      bottom: 250,
      width: 100,
      height: 100,
      x: 5,
      y: 150,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');
    const snappedHeight = ((window.innerHeight - 28) / window.innerHeight) * 100;
    expect(ref.current!.state.height).toBeCloseTo(snappedHeight, 5);

    act(() => {
      ref.current!.changeCursorToMove();
    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
  });
});

describe('Window monitor bounds', () => {
  it('computes drag bounds from monitor dimensions', () => {
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
        monitorRect={{ left: 500, top: 0, width: 400, height: 600 }}
        ref={ref}
      />
    );

    act(() => {
      (ref.current as any).resizeBoundries();
    });

    const { dragBounds } = ref.current!.state as any;
    expect(dragBounds.left).toBe(500);
    expect(dragBounds.right).toBeCloseTo(660, 5);
    expect(dragBounds.bottom).toBeCloseTo(62, 5);
  });

  it('clamps window transform inside monitor', () => {
    const ref = React.createRef<Window>();
    const onPositionChange = jest.fn();
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
        monitorRect={{ left: 500, top: 0, width: 400, height: 600 }}
        onPositionChange={onPositionChange}
        ref={ref}
      />
    );

    const node = document.getElementById('test-window')!;
    let mockLeft = 500;
    let mockTop = 32;
    node.getBoundingClientRect = () => ({
      left: mockLeft,
      top: mockTop,
      right: mockLeft + 100,
      bottom: mockTop + 100,
      width: 100,
      height: 100,
      x: mockLeft,
      y: mockTop,
      toJSON: () => {},
    });

    act(() => {
      (ref.current as any).resizeBoundries();
    });

    mockLeft = 720;
    mockTop = 500;

    expect(node.style.transform).toBe('translate(500px, 0px)');

    node.style.transform = 'translate(720px, 468px)';

    act(() => {
      (ref.current as any).enforceMonitorBounds();
    });

    expect(node.style.transform).toBe('translate(660px, 62px)');
    expect(onPositionChange).toHaveBeenCalledWith(660, 62);
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
      const winEl = document.getElementById('test-window')!;
      winEl.getBoundingClientRect = () => {
        const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(winEl.style.transform);
        const x = match ? parseFloat(match[1]) : 0;
        const yTransform = match ? parseFloat(match[2]) : 0;
        const y = yTransform + 32;
        return {
          left: x,
          top: y,
          right: x + 100,
          bottom: y + 100,
          width: 100,
          height: 100,
          x,
          y,
          toJSON: () => {},
        } as DOMRect;
      };

      fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
      fireEvent.keyDown(handle, { key: 'ArrowRight' });

      expect(winEl.style.transform).toBe('translate(10px, 0px)');
    expect(handle).toHaveAttribute('aria-grabbed', 'true');

    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    expect(handle).toHaveAttribute('aria-grabbed', 'false');
  });

    it('prevents keyboard dragging outside monitor bounds', () => {
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

      const handle = screen.getByText('Test').parentElement!;
      const winEl = document.getElementById('test-window')!;
      winEl.style.transform = 'translate(40px, 0px)';
      winEl.getBoundingClientRect = () => {
        const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(winEl.style.transform);
        const x = match ? parseFloat(match[1]) : 0;
        const yTransform = match ? parseFloat(match[2]) : 0;
        const y = yTransform + 32;
        return {
          left: x,
          top: y,
          right: x + 100,
          bottom: y + 100,
          width: 100,
          height: 100,
          x,
          y,
          toJSON: () => {},
        } as DOMRect;
      };

      act(() => {
        ref.current!.setState({
          dragBounds: { left: 0, right: 50, top: 0, bottom: 80 },
        });
      });

      fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      expect(winEl.style.transform).toBe('translate(50px, 0px)');
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      expect(winEl.style.transform).toBe('translate(50px, 0px)');

      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
      expect(winEl.style.transform).toBe('translate(40px, 0px)');
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
      expect(winEl.style.transform).toBe('translate(30px, 0px)');
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
      expect(winEl.style.transform).toBe('translate(20px, 0px)');
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
      expect(winEl.style.transform).toBe('translate(10px, 0px)');
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
      expect(winEl.style.transform).toBe('translate(0px, 0px)');
      fireEvent.keyDown(handle, { key: 'ArrowLeft' });
      expect(winEl.style.transform).toBe('translate(0px, 0px)');
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
