import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Window from '../components/base/window';

function createWindowArea() {
  const area = document.createElement('div');
  area.id = 'window-area';
  area.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: 1024,
    bottom: 768,
    width: 1024,
    height: 768,
    x: 0,
    y: 0,
    toJSON: () => ({})
  });
  document.body.appendChild(area);
  return area;
}

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));

let rafSpy: jest.SpyInstance<number, [FrameRequestCallback]>;

beforeAll(() => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = ((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    }) as any;
  }
});

beforeEach(() => {
  rafSpy = jest
    .spyOn(window, 'requestAnimationFrame')
    .mockImplementation((cb: FrameRequestCallback) => {
      cb(0);
      return 0;
    });
});

afterEach(() => {
  rafSpy?.mockRestore();
});

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
    const area = createWindowArea();
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
      (ref.current as any).updateSnapPreviewFromNode(winEl);
    });

    expect(screen.getByTestId('snap-preview')).toBeInTheDocument();
    document.body.removeChild(area);
  });

  it('hides preview when away from edge', () => {
    const area = createWindowArea();
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
      (ref.current as any).updateSnapPreviewFromNode(winEl);
    });

    expect(screen.queryByTestId('snap-preview')).toBeNull();
    document.body.removeChild(area);
  });
});

describe('Window snapping finalize and release', () => {
  it('snaps window on drag stop near left edge', () => {
    const area = createWindowArea();
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
      (ref.current as any).updateSnapPreviewFromNode(winEl);
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('left');
    expect(ref.current!.state.width).toBeCloseTo(50, 5);
    expect(ref.current!.state.height).toBeCloseTo(100, 5);
    const node = document.getElementById('test-window');
    expect(node).toHaveAttribute('data-snap-position', 'left');
    document.body.removeChild(area);
  });

  it('releases snap with Alt+ArrowDown restoring size', () => {
    const area = createWindowArea();
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
      (ref.current as any).updateSnapPreviewFromNode(winEl);
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
        stopPropagation: () => {}
      } as any);
    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
    document.body.removeChild(area);
  });

  it('releases snap when starting drag', () => {
    const area = createWindowArea();
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
      (ref.current as any).updateSnapPreviewFromNode(winEl);
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
    document.body.removeChild(area);
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
