import React, { act } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Window from '../components/desktop/Window';
import styles from '../components/base/window.module.css';
import { DESKTOP_TOP_PADDING, SNAP_BOTTOM_INSET } from '../utils/uiConstants';
import { measureSafeAreaInset, measureWindowTopOffset } from '../utils/windowLayout';

jest.mock('../utils/windowLayout', () => {
  const actual = jest.requireActual('../utils/windowLayout');
  return {
    ...actual,
    measureSafeAreaInset: jest.fn(() => 0),
    measureWindowTopOffset: jest.fn(() => actual.DEFAULT_WINDOW_TOP_OFFSET),
  };
});

const measureSafeAreaInsetMock = measureSafeAreaInset as jest.MockedFunction<typeof measureSafeAreaInset>;
const measureWindowTopOffsetMock = measureWindowTopOffset as jest.MockedFunction<typeof measureWindowTopOffset>;

const computeSnappedHeightPercent = () => {
  const topOffset = measureWindowTopOffset();
  const safeBottom = Math.max(0, measureSafeAreaInset('bottom'));
  const availableHeight = window.innerHeight - topOffset - SNAP_BOTTOM_INSET - safeBottom;
  return (availableHeight / window.innerHeight) * 100;
};

const getSnapOffsetTop = () => measureWindowTopOffset() - DESKTOP_TOP_PADDING;

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
};

beforeEach(() => {
  setViewport(1440, 900);
  measureSafeAreaInsetMock.mockReturnValue(0);
  measureWindowTopOffsetMock.mockReturnValue(DESKTOP_TOP_PADDING);
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

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={closed}
        openApp={() => {}}
      />
    );

    const closeButton = screen.getByRole('button', { name: /window close/i });
    fireEvent.click(closeButton);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(closed).toHaveBeenCalledWith('test-window');
    jest.useRealTimers();
  });
});

describe('Window minimize animations', () => {
  it('applies minimizing class until animation completes', async () => {
    jest.useFakeTimers();
    const hasMinimised = jest.fn();
    const ref = React.createRef<any>();

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={hasMinimised}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;

    await act(async () => {
      const promise = ref.current!.minimizeWindow();
      expect(winEl.classList.contains(styles.windowFrameMinimizing)).toBe(true);
      expect(hasMinimised).not.toHaveBeenCalled();
      fireEvent.animationEnd(winEl);
      await promise;
    });

    expect(hasMinimised).toHaveBeenCalledWith('test-window');
    act(() => {
      jest.runOnlyPendingTimers();
    });
    expect(winEl.classList.contains(styles.windowFrameMinimizing)).toBe(false);
    jest.useRealTimers();
  });

  it('skips animation when prefers-reduced-motion is enabled', async () => {
    const hasMinimised = jest.fn();
    const ref = React.createRef<any>();
    const originalMatchMedia = window.matchMedia;
    const mockMatchMedia = jest
      .spyOn(window, 'matchMedia')
      .mockImplementation((query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        addListener: jest.fn(),
        removeListener: jest.fn(),
        dispatchEvent: jest.fn(),
      }) as unknown as MediaQueryList);

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={hasMinimised}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    const winEl = document.getElementById('test-window')!;

    await act(async () => {
      await ref.current!.minimizeWindow();
    });

    expect(hasMinimised).toHaveBeenCalledWith('test-window');
    expect(winEl.classList.contains(styles.windowFrameMinimizing)).toBe(false);
    mockMatchMedia.mockRestore();
    window.matchMedia = originalMatchMedia;
  });

  it('applies restoring class when minimized prop is cleared', async () => {
    jest.useFakeTimers();
    const { rerender } = render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        minimized
        closed={() => {}}
        openApp={() => {}}
      />
    );

    const winEl = document.getElementById('test-window')!;
    expect(winEl.classList.contains(styles.windowFrameRestoring)).toBe(false);

    act(() => {
      rerender(
        <Window
          id="test-window"
          title="Test"
          screen={() => <div>content</div>}
          focus={() => {}}
          hasMinimised={() => {}}
          minimized={false}
          closed={() => {}}
          openApp={() => {}}
        />
      );
    });

    expect(winEl.classList.contains(styles.windowFrameRestoring)).toBe(true);

    await act(async () => {
      fireEvent.animationEnd(winEl);
    });

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(winEl.classList.contains(styles.windowFrameRestoring)).toBe(false);
    jest.useRealTimers();
  });
});

describe('Window snapping preview', () => {
  it('shows preview when dragged near left edge', () => {
    setViewport(1920, 1080);
    const ref = React.createRef<any>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
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
    const ref = React.createRef<any>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
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
    const ref = React.createRef<any>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
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
    const ref = React.createRef<any>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
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
    expect(ref.current!.state.width).toBeCloseTo(50);
    const expectedHeight = computeSnappedHeightPercent();
    expect(ref.current!.state.height).toBeCloseTo(expectedHeight, 5);
    const snapOffset = getSnapOffsetTop();
    expect(winEl.style.transform).toBe(`translate(0px, ${snapOffset}px)`);
  });

  it('snaps window on drag stop near right edge on large viewport', () => {
    setViewport(1920, 1080);
    const ref = React.createRef<any>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
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
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('right');
    expect(ref.current!.state.width).toBeCloseTo(50);
    const expectedHeight = computeSnappedHeightPercent();
    expect(ref.current!.state.height).toBeCloseTo(expectedHeight, 5);
    const rightSnapOffset = getSnapOffsetTop();
    expect(winEl.style.transform).toBe(`translate(${window.innerWidth / 2}px, ${rightSnapOffset}px)`);
  });

  it('snaps window on drag stop near top edge', () => {
    setViewport(1366, 768);
    const ref = React.createRef<any>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
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
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('top');
    expect(ref.current!.state.width).toBeCloseTo(100, 2);
    expect(ref.current!.state.height).toBeCloseTo(50, 2);
    const topSnapOffset = getSnapOffsetTop();
    expect(winEl.style.transform).toBe(`translate(0px, ${topSnapOffset}px)`);
  });

  it('releases snap with Alt+ArrowDown restoring size', () => {
    setViewport(1024, 768);
    const ref = React.createRef<any>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
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
    const snappedHeight = computeSnappedHeightPercent();
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
    const ref = React.createRef<any>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
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
    const snappedHeight = computeSnappedHeightPercent();
    expect(ref.current!.state.height).toBeCloseTo(snappedHeight, 5);

    act(() => {
      ref.current!.changeCursorToMove();
    });

    expect(ref.current!.state.snapped).toBeNull();
    expect(ref.current!.state.width).toBe(60);
    expect(ref.current!.state.height).toBe(85);
  });
});

describe('Window maximize behavior', () => {
  it('respects safe-area aware top offset when maximizing', () => {
    const safeTop = DESKTOP_TOP_PADDING + 48;
    measureWindowTopOffsetMock.mockReturnValue(safeTop);

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
      />
    );

    const maximizeButton = screen.getByRole('button', { name: /window maximize/i });
    fireEvent.click(maximizeButton);

    const winEl = document.getElementById('test-window') as HTMLElement | null;
    expect(winEl?.style.transform).toBe(`translate(-1pt, ${safeTop - DESKTOP_TOP_PADDING}px)`);
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
    const ref = React.createRef<any>();
    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
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

    const expectedTop = ref.current!.state.safeAreaTop ?? 0;
    expect(winEl.style.transform).toBe(`translate(0px, ${expectedTop}px)`);
  });
});

describe('Window viewport constraints', () => {
  it('clamps window transform when viewport shrinks', () => {
    const ref = React.createRef<any>();
    const onPositionChange = jest.fn();

    render(
      <Window
        id="test-window"
        title="Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
        onPositionChange={onPositionChange}
      />
    );

    const winEl = document.getElementById('test-window')!;
    winEl.getBoundingClientRect = () => ({
      left: 0,
      top: 0,
      right: 300,
      bottom: 200,
      width: 300,
      height: 200,
      x: 0,
      y: 0,
      toJSON: () => {}
    });

    act(() => {
      winEl.style.transform = 'translate(1100px, 750px)';
      winEl.style.setProperty('--window-transform-x', '1100px');
      winEl.style.setProperty('--window-transform-y', '750px');
    });

    setViewport(800, 600);

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const match = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(winEl.style.transform);
    expect(match).not.toBeNull();
    if (!match) return;

    const [, rawX, rawY] = match;
    const clampedX = parseFloat(rawX);
    const clampedY = parseFloat(rawY);
    const maxX = Math.max(800 - 300, 0);
    const topOffset = measureWindowTopOffset();
    const safeBottom = Math.max(0, measureSafeAreaInset('bottom'));
    const maxY = topOffset + Math.max(600 - topOffset - SNAP_BOTTOM_INSET - safeBottom - 200, 0);

    expect(clampedX).toBeGreaterThanOrEqual(0);
    expect(clampedX).toBeLessThanOrEqual(maxX);
    expect(clampedY).toBeGreaterThanOrEqual(topOffset);
    expect(clampedY).toBeLessThanOrEqual(maxY);
    expect(onPositionChange).toHaveBeenCalledWith(clampedX, clampedY);
  });
});

describe('Window overlay inert behaviour', () => {
  it('sets and removes inert on default __next root restoring focus', () => {
    const ref = React.createRef<any>();
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
    const ref = React.createRef<any>();
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
