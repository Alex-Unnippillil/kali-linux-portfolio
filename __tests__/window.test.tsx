import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Window from '../components/base/window';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock('../components/apps/terminal', () => ({ displayTerminal: jest.fn() }));

const DESKTOP_WIDTH = 1200;
const DESKTOP_HEIGHT = 800;
const ORIGINAL_VIEWPORT = { width: window.innerWidth, height: window.innerHeight };

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, value: width, writable: true });
  Object.defineProperty(window, 'innerHeight', { configurable: true, value: height, writable: true });
};

const createDesktopContainer = () => {
  const container = document.createElement('div');
  container.id = 'window-area';
  container.style.position = 'relative';
  container.style.width = `${DESKTOP_WIDTH}px`;
  container.style.height = `${DESKTOP_HEIGHT}px`;
  container.getBoundingClientRect = () => ({
    left: 0,
    top: 0,
    right: DESKTOP_WIDTH,
    bottom: DESKTOP_HEIGHT,
    width: DESKTOP_WIDTH,
    height: DESKTOP_HEIGHT,
    x: 0,
    y: 0,
    toJSON: () => {},
  });
  document.body.appendChild(container);
  return container;
};

const attachComputedRect = (element: HTMLElement) => {
  element.getBoundingClientRect = () => {
    const transform = element.style.transform || 'translate(0px, 0px)';
    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(transform);
    const x = match ? parseFloat(match[1]) : 0;
    const y = match ? parseFloat(match[2]) : 0;
    const widthPercent = parseFloat(element.style.width || '0');
    const heightPercent = parseFloat(element.style.height || '0');
    const width = (DESKTOP_WIDTH * widthPercent) / 100;
    const height = (DESKTOP_HEIGHT * heightPercent) / 100;
    return {
      left: x,
      top: y,
      right: x + width,
      bottom: y + height,
      width,
      height,
      x,
      y,
      toJSON: () => {},
    } as unknown as DOMRect;
  };
};

beforeEach(() => {
  setViewport(DESKTOP_WIDTH, DESKTOP_HEIGHT);
});

afterEach(() => {
  setViewport(ORIGINAL_VIEWPORT.width, ORIGINAL_VIEWPORT.height);
  document.querySelectorAll('#window-area').forEach((node) => node.remove());
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
    const ref = React.createRef<Window>();
    const desktop = createDesktopContainer();
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
      { container: desktop }
    );

    const winEl = document.getElementById('test-window')!;
    // Simulate being near the left edge
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 80,
      right: 105,
      bottom: 180,
      width: 100,
      height: 100,
      x: 5,
      y: 80,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });

    expect(screen.getByTestId('snap-preview')).toBeInTheDocument();
  });

  it('hides preview when away from edge', () => {
    const ref = React.createRef<Window>();
    const desktop = createDesktopContainer();
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
      { container: desktop }
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
    const desktop = createDesktopContainer();
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
      { container: desktop }
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 80,
      right: 105,
      bottom: 180,
      width: 100,
      height: 100,
      x: 5,
      y: 80,
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
    expect(ref.current!.state.height).toBe(100);
  });

  it('releases snap with Alt+ArrowDown restoring size', () => {
    const ref = React.createRef<Window>();
    const desktop = createDesktopContainer();
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
      { container: desktop }
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 80,
      right: 105,
      bottom: 180,
      width: 100,
      height: 100,
      x: 5,
      y: 80,
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
    const desktop = createDesktopContainer();
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
      { container: desktop }
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 80,
      right: 105,
      bottom: 180,
      width: 100,
      height: 100,
      x: 5,
      y: 80,
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

describe('Window snapping geometry', () => {
  const renderSnappableWindow = () => {
    const ref = React.createRef<Window>();
    const desktop = createDesktopContainer();
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
      { container: desktop }
    );
    const winEl = document.getElementById('test-window')!;
    if (!winEl.style.transform) {
      winEl.style.transform = 'translate(0px, 0px)';
    }
    attachComputedRect(winEl);
    return { ref, winEl };
  };

  it('aligns left snap to half the desktop', () => {
    const { ref, winEl } = renderSnappableWindow();
    act(() => {
      ref.current!.snapWindow('left');
    });
    const rect = winEl.getBoundingClientRect();
    expect(rect.left).toBeCloseTo(0, 5);
    expect(rect.top).toBeCloseTo(0, 5);
    expect(rect.width).toBeCloseTo(DESKTOP_WIDTH / 2, 5);
    expect(rect.height).toBeCloseTo(DESKTOP_HEIGHT, 5);
  });

  it('aligns right snap to half the desktop width', () => {
    const { ref, winEl } = renderSnappableWindow();
    act(() => {
      ref.current!.snapWindow('right');
    });
    const rect = winEl.getBoundingClientRect();
    expect(rect.left).toBeCloseTo(DESKTOP_WIDTH / 2, 5);
    expect(rect.top).toBeCloseTo(0, 5);
    expect(rect.width).toBeCloseTo(DESKTOP_WIDTH / 2, 5);
    expect(rect.height).toBeCloseTo(DESKTOP_HEIGHT, 5);
  });

  it('maximizes to fill the desktop when snapped to the top', () => {
    const { ref, winEl } = renderSnappableWindow();
    act(() => {
      ref.current!.snapWindow('top');
    });
    const rect = winEl.getBoundingClientRect();
    expect(rect.left).toBeCloseTo(0, 5);
    expect(rect.top).toBeCloseTo(0, 5);
    expect(rect.width).toBeCloseTo(DESKTOP_WIDTH, 5);
    expect(rect.height).toBeCloseTo(DESKTOP_HEIGHT, 5);
    expect(ref.current!.state.maximized).toBe(true);
  });

  it('snaps to the bottom half of the desktop', () => {
    const { ref, winEl } = renderSnappableWindow();
    act(() => {
      ref.current!.snapWindow('bottom');
    });
    const rect = winEl.getBoundingClientRect();
    expect(rect.left).toBeCloseTo(0, 5);
    expect(rect.top).toBeCloseTo(DESKTOP_HEIGHT / 2, 5);
    expect(rect.width).toBeCloseTo(DESKTOP_WIDTH, 5);
    expect(rect.height).toBeCloseTo(DESKTOP_HEIGHT / 2, 5);
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
