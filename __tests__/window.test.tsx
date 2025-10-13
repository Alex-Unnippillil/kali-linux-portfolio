import React, { act } from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import Window from '../components/desktop/Window';
import windowStyles from '../components/base/window.module.css';
import { DESKTOP_TOP_PADDING, SNAP_BOTTOM_INSET } from '../utils/uiConstants';
import {
  DEFAULT_SNAP_BOTTOM_INSET,
  measureSafeAreaInset,
  measureSnapBottomInset,
  measureWindowTopOffset,
} from '../utils/windowLayout';

jest.mock('../utils/windowLayout', () => {
  const actual = jest.requireActual('../utils/windowLayout');
  return {
    ...actual,
    measureSafeAreaInset: jest.fn(() => 0),
    measureWindowTopOffset: jest.fn(() => actual.DEFAULT_WINDOW_TOP_OFFSET),
    measureSnapBottomInset: jest.fn(() => actual.DEFAULT_SNAP_BOTTOM_INSET),
  };
});

const measureSafeAreaInsetMock = measureSafeAreaInset as jest.MockedFunction<typeof measureSafeAreaInset>;
const measureWindowTopOffsetMock = measureWindowTopOffset as jest.MockedFunction<typeof measureWindowTopOffset>;
const measureSnapBottomInsetMock = measureSnapBottomInset as jest.MockedFunction<typeof measureSnapBottomInset>;

const computeAvailableHeightPx = () => {
  const topOffset = measureWindowTopOffset();
  const safeBottom = Math.max(0, measureSafeAreaInset('bottom'));
  const snapBottomInset = measureSnapBottomInset();
  return window.innerHeight - topOffset - snapBottomInset - safeBottom;
};

const computeSnappedHeightPercent = () => (computeAvailableHeightPx() / window.innerHeight) * 100;

const computeQuarterHeightPercent = () => computeSnappedHeightPercent() / 2;

const computeLeftSnapTestTop = () => {
  const available = computeAvailableHeightPx();
  const offset = DESKTOP_TOP_PADDING;
  const preferred = offset + available * 0.75;
  const upperBound = window.innerHeight - 120;
  const lowerBound = offset + 16;
  const clamped = Math.min(Math.max(preferred, lowerBound), upperBound);
  return Math.round(clamped);
};

const getSnapTranslateTop = () => measureWindowTopOffset();

const setViewport = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
};

const setVisualViewport = (width?: number, height?: number) => {
  if (typeof width === 'number' && typeof height === 'number') {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      writable: true,
      value: { width, height },
    });
    return;
  }

  delete (window as any).visualViewport;
};

type RectConfig = { left: number; top: number; width: number; height: number };

const setWindowRect = (element: HTMLElement, rect: RectConfig) => {
  element.getBoundingClientRect = () => ({
    left: rect.left,
    top: rect.top,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    width: rect.width,
    height: rect.height,
    x: rect.left,
    y: rect.top,
    toJSON: () => {},
  } as DOMRect);
  element.style.setProperty('--window-transform-x', `${rect.left}px`);
  element.style.setProperty('--window-transform-y', `${rect.top}px`);
  element.style.transform = `translate(${rect.left}px, ${rect.top}px)`;
};

const startDragAt = (instance: any, clientX: number, clientY: number) => {
  instance.handlePointerDragStart?.(null, { clientX, clientY });
};

const moveDragTo = (instance: any, clientX: number, clientY: number) => {
  instance.handlePointerDragMove?.(null, { clientX, clientY });
};

const endDragAt = (instance: any, clientX: number, clientY: number) => {
  instance.handlePointerDragEnd?.(null, { clientX, clientY });
  instance.handlePointerCaptureEnd?.();
};

beforeEach(() => {
  setViewport(1440, 900);
  measureSafeAreaInsetMock.mockReturnValue(0);
  measureWindowTopOffsetMock.mockReturnValue(DESKTOP_TOP_PADDING);
  measureSnapBottomInsetMock.mockReturnValue(DEFAULT_SNAP_BOTTOM_INSET);
});

afterEach(() => {
  setVisualViewport();
});

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
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

  it('focuses the frame when mounting a focused window', () => {
    const focus = jest.fn();

    render(
      <Window
        id="focused-window"
        title="Focused"
        screen={() => <div>content</div>}
        focus={focus}
        isFocused
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
      />
    );

    const frame = document.getElementById('focused-window');
    expect(frame).not.toBeNull();
    expect(frame).toHaveFocus();
    expect(focus).toHaveBeenCalledWith('focused-window');
  });
});

describe('Window snap grid configuration', () => {
  it('snaps dimensions using axis-specific grid values', () => {
    const ref = React.createRef<any>();
    render(
      <Window
        id="grid-snap-test"
        title="Grid Snap"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        snapEnabled
        snapGrid={[16, 24]}
        ref={ref}
      />
    );

    expect(ref.current!.snapToGrid(23, 'x')).toBe(16);
    expect(ref.current!.snapToGrid(23, 'y')).toBe(24);
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
    winEl.style.setProperty('--window-transform-x', '5px');
    winEl.style.setProperty('--window-transform-y', '150px');
    winEl.style.transform = 'translate(5px, 150px)';

    act(() => {
      ref.current!.handlePointerDragStart(null, { clientX: 8, clientY: 160 });
      ref.current!.handlePointerDragMove(null, { clientX: 8, clientY: 160 });
    });

    const preview = screen.getByTestId('snap-preview');
    expect(preview).toBeInTheDocument();
    expect(preview).toHaveClass(windowStyles.snapPreviewGlass);
    expect((preview as HTMLElement).style.backdropFilter).toBe('brightness(1.1) saturate(1.2)');
    expect(preview).toHaveAttribute('aria-label', 'Snap left half');
    expect(within(preview).getByText('Snap left half')).toBeInTheDocument();
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
    winEl.style.setProperty('--window-transform-x', '200px');
    winEl.style.setProperty('--window-transform-y', '200px');
    winEl.style.transform = 'translate(200px, 200px)';

    act(() => {
      ref.current!.handlePointerDragStart(null, { clientX: 260, clientY: 260 });
      ref.current!.handlePointerDragMove(null, { clientX: 260, clientY: 260 });
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
    setWindowRect(winEl, { left: 400, top: 5, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 410, 15);
      moveDragTo(ref.current!, 410, 15);
    });

    expect(ref.current!.state.snapPosition).toBe('top');
    const preview = screen.getByTestId('snap-preview');
    expect(preview).toHaveStyle(`height: ${computeAvailableHeightPx()}px`);
    expect(preview).toHaveAttribute('aria-label', 'Snap full screen');
    expect(within(preview).getByText('Snap full screen')).toBeInTheDocument();
  });

  it('shows corner preview when dragged near the top-left edge', () => {
    setViewport(1600, 900);
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
    setWindowRect(winEl, { left: 4, top: 6, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 12, 18);
      moveDragTo(ref.current!, 12, 18);
    });

    expect(ref.current!.state.snapPosition).toBe('top-left');
    const preview = screen.getByTestId('snap-preview');
    expect(preview).toHaveStyle(`width: ${window.innerWidth / 2}px`);
    expect(preview).toHaveStyle(`height: ${computeAvailableHeightPx() / 2}px`);
    expect(preview).toHaveAttribute('aria-label', 'Snap top-left quarter');
    expect(within(preview).getByText('Snap top-left quarter')).toBeInTheDocument();
  });

  it('shows right-half preview when dragged near the bottom-right edge', () => {
    setViewport(1600, 900);
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
    setWindowRect(winEl, { left: 1490, top: 770, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 1575, 840);
      moveDragTo(ref.current!, 1575, 840);
    });

    expect(ref.current!.state.snapPosition).toBe('right');
    const preview = screen.getByTestId('snap-preview');
    expect(preview).toHaveStyle(`left: ${window.innerWidth / 2}px`);
    expect(preview).toHaveStyle(
      `top: ${measureWindowTopOffset()}px`
    );
    expect(preview).toHaveStyle(`height: ${computeAvailableHeightPx()}px`);
    expect(preview).toHaveAttribute('aria-label', 'Snap right half');
    expect(within(preview).getByText('Snap right half')).toBeInTheDocument();
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
    const leftSnapTop = computeLeftSnapTestTop();
    setWindowRect(winEl, { left: 5, top: leftSnapTop, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 12, leftSnapTop + 12);
      moveDragTo(ref.current!, 12, leftSnapTop + 12);
    });
    act(() => {
      endDragAt(ref.current!, 12, leftSnapTop + 12);
    });

    expect(ref.current!.state.snapped).toBe('left');
    expect(ref.current!.state.width).toBeCloseTo(50);
    const expectedHeight = computeSnappedHeightPercent();
    expect(ref.current!.state.height).toBeCloseTo(expectedHeight, 5);
    const snapTop = getSnapTranslateTop();
    expect(winEl.style.transform).toBe(`translate(0px, ${snapTop}px)`);
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
    setWindowRect(winEl, { left: 1820, top: 200, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 1870, 250);
      moveDragTo(ref.current!, 1870, 250);
    });
    act(() => {
      endDragAt(ref.current!, 1870, 250);
    });

    expect(ref.current!.state.snapped).toBe('right');
    expect(ref.current!.state.width).toBeCloseTo(50);
    const expectedHeight = computeSnappedHeightPercent();
    expect(ref.current!.state.height).toBeCloseTo(expectedHeight, 5);
    const rightSnapTop = getSnapTranslateTop();
    expect(winEl.style.transform).toBe(`translate(${window.innerWidth / 2}px, ${rightSnapTop}px)`);
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
    setWindowRect(winEl, { left: 400, top: 6, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 450, 20);
      moveDragTo(ref.current!, 450, 20);
    });
    act(() => {
      endDragAt(ref.current!, 450, 20);
    });

    expect(ref.current!.state.snapped).toBe('top');
    expect(ref.current!.state.width).toBeCloseTo(100, 2);
    expect(ref.current!.state.height).toBeCloseTo(computeSnappedHeightPercent(), 5);
    const topSnapTop = getSnapTranslateTop();
    expect(winEl.style.transform).toBe(`translate(0px, ${topSnapTop}px)`);
  });

  it('snaps window on drag stop near the top-left corner', () => {
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
    setWindowRect(winEl, { left: 6, top: 8, width: 100, height: 200 });

    act(() => {
      startDragAt(ref.current!, 20, 36);
      moveDragTo(ref.current!, 20, 36);
    });
    act(() => {
      endDragAt(ref.current!, 20, 36);
    });

    expect(ref.current!.state.snapped).toBe('top-left');
    expect(ref.current!.state.width).toBeCloseTo(50, 2);
    expect(ref.current!.state.height).toBeCloseTo(computeQuarterHeightPercent(), 5);
    const snapTop = getSnapTranslateTop();
    expect(winEl.style.transform).toBe(`translate(0px, ${snapTop}px)`);
  });

  it('snaps window on drag stop near the bottom-right corner', () => {
    setViewport(1600, 900);
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
    setWindowRect(winEl, { left: 1500, top: 760, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 1580, 820);
      moveDragTo(ref.current!, 1580, 820);
    });
    act(() => {
      endDragAt(ref.current!, 1580, 820);
    });

    expect(ref.current!.state.snapped).toBe('right');
    expect(ref.current!.state.width).toBeCloseTo(50, 2);
    const expectedHeight = computeSnappedHeightPercent();
    expect(ref.current!.state.height).toBeCloseTo(expectedHeight, 5);
    const expectedX = window.innerWidth / 2;
    const expectedY = getSnapTranslateTop();
    expect(winEl.style.transform).toBe(`translate(${expectedX}px, ${expectedY}px)`);
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
    const leftSnapTop = computeLeftSnapTestTop();
    setWindowRect(winEl, { left: 5, top: leftSnapTop, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 15, leftSnapTop + 20);
      moveDragTo(ref.current!, 15, leftSnapTop + 20);
    });
    act(() => {
      endDragAt(ref.current!, 15, leftSnapTop + 20);
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
    setWindowRect(winEl, { left: 5, top: 150, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 15, 170);
      moveDragTo(ref.current!, 15, 170);
    });
    act(() => {
      endDragAt(ref.current!, 15, 170);
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
    const winEl = document.getElementById('test-window')!;
    setWindowRect(winEl, { left: 0, top: 0, width: 100, height: 100 });

    fireEvent.keyDown(handle, { key: ' ', code: 'Space' });
    fireEvent.keyDown(handle, { key: 'ArrowRight' });

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
    const topBound = ref.current!.state.safeAreaTop ?? 0;
    setWindowRect(winEl, { left: 0, top: topBound, width: 100, height: 100 });

    act(() => {
      startDragAt(ref.current!, 16, topBound + 16);
      moveDragTo(ref.current!, -80, topBound - 40);
    });

    expect(winEl.style.transform).toBe(`translate(0px, ${topBound}px)`);
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
    const snapBottomInset = measureSnapBottomInset();
    const maxY = topOffset + Math.max(600 - topOffset - snapBottomInset - safeBottom - 200, 0);

    expect(clampedX).toBeGreaterThanOrEqual(0);
    expect(clampedX).toBeLessThanOrEqual(maxX);
    expect(clampedY).toBeGreaterThanOrEqual(topOffset);
    expect(clampedY).toBeLessThanOrEqual(maxY);
    expect(onPositionChange).toHaveBeenCalledWith(clampedX, clampedY);
  });

  it('uses visual viewport size when available', () => {
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

    setVisualViewport(800, 700);

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    const state = ref.current!.state;
    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const expectedWidth = Math.max(
      viewportWidth - viewportWidth * (state.width / 100),
      0,
    );
    const availableVertical = Math.max(
      viewportHeight - measureWindowTopOffset() - SNAP_BOTTOM_INSET - Math.max(0, measureSafeAreaInset('bottom')),
      0,
    );
    const expectedHeight = Math.max(
      availableVertical - viewportHeight * (state.height / 100),
      0,
    );

    expect(state.parentSize.width).toBeCloseTo(expectedWidth);
    expect(state.parentSize.height).toBeCloseTo(expectedHeight);
    expect(state.safeAreaTop).toBe(DESKTOP_TOP_PADDING);
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
