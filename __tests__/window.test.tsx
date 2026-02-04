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

const setVisualViewport = (width?: number, height?: number, offsetLeft = 0, offsetTop = 0) => {
  if (typeof width === 'number' && typeof height === 'number') {
    Object.defineProperty(window, 'visualViewport', {
      configurable: true,
      writable: true,
      value: { width, height, offsetLeft, offsetTop },
    });
    return;
  }

  delete (window as any).visualViewport;
};

beforeEach(() => {
  localStorage.clear();
  setViewport(1440, 900);
  measureSafeAreaInsetMock.mockReturnValue(0);
  measureWindowTopOffsetMock.mockReturnValue(DESKTOP_TOP_PADDING);
  measureSnapBottomInsetMock.mockReturnValue(DEFAULT_SNAP_BOTTOM_INSET);
});

afterEach(() => {
  setVisualViewport();
});

jest.mock('react-draggable', () => {
  const React = require('react');
  const MockDraggable = ({ children, grid, cancel, position }: any) => (
    <div
      data-testid="draggable-mock"
      data-grid={Array.isArray(grid) ? grid.join(',') : undefined}
      data-cancel={cancel}
      data-position={position ? `${position.x},${position.y}` : undefined}
    >
      {children}
    </div>
  );
  MockDraggable.displayName = 'MockDraggable';
  return {
    __esModule: true,
    default: MockDraggable,
  };
});
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
  it('applies custom grid to draggable when snapping is enabled', () => {
    render(
      <Window
        id="grid-test"
        title="Grid Test"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        snapEnabled
        snapGrid={[16, 24]}
      />
    );

    const draggable = screen.getByTestId('draggable-mock');
    expect(draggable).toHaveAttribute('data-grid', '16,24');
  });

  it('excludes resize handles from draggable interactions', () => {
    render(
      <Window
        id="grid-cancel-test"
        title="Grid Cancel"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
      />
    );

    const draggable = screen.getByTestId('draggable-mock');
    expect(draggable).toHaveAttribute('data-cancel', expect.stringContaining('[data-resize-handle]'));
  });

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

describe('Window drag position synchronization', () => {
  it('tracks drag position in state when a drag begins', () => {
    const ref = React.createRef<any>();
    render(
      <Window
        id="drag-sync-test"
        title="Drag Sync"
        screen={() => <div>content</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        ref={ref}
      />
    );

    act(() => {
      ref.current!.handleDragStart(null, { x: 120, y: 140 });
    });

    expect(ref.current!.state.position).toEqual(ref.current!.getResistedPosition({ x: 120, y: 140 }));
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
    winEl.getBoundingClientRect = () => ({
      left: 4,
      top: 6,
      right: 104,
      bottom: 106,
      width: 100,
      height: 100,
      x: 4,
      y: 6,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
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
    winEl.getBoundingClientRect = () => ({
      left: 1490,
      top: 770,
      right: 1590,
      bottom: 870,
      width: 100,
      height: 100,
      x: 1490,
      y: 770,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
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
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: leftSnapTop,
      right: 105,
      bottom: leftSnapTop + 100,
      width: 100,
      height: 100,
      x: 5,
      y: leftSnapTop,
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
    const rightSnapTop = getSnapTranslateTop();
    expect(winEl.style.transform).toBe(`translate(${window.innerWidth / 2}px, ${rightSnapTop}px)`);
  });

  it('aligns snapped window with offset parent inset', () => {
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
    const offsetParentRect = {
      left: 0,
      top: DESKTOP_TOP_PADDING,
      right: window.innerWidth,
      bottom: window.innerHeight,
      width: window.innerWidth,
      height: window.innerHeight,
      x: 0,
      y: DESKTOP_TOP_PADDING,
      toJSON: () => ({}),
    };
    const offsetParent = {
      getBoundingClientRect: jest.fn(() => offsetParentRect),
    } as any;
    Object.defineProperty(winEl, 'offsetParent', {
      configurable: true,
      value: offsetParent,
    });

    winEl.getBoundingClientRect = () => ({
      left: window.innerWidth - 100,
      top: DESKTOP_TOP_PADDING + 180,
      right: window.innerWidth,
      bottom: DESKTOP_TOP_PADDING + 280,
      width: 100,
      height: 100,
      x: window.innerWidth - 100,
      y: DESKTOP_TOP_PADDING + 180,
      toJSON: () => ({}),
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
    });

    expect(ref.current!.state.snapped).toBe('right');
    expect(winEl.style.transform).toBe(`translate(${window.innerWidth / 2}px, 0px)`);

    delete (winEl as any).offsetParent;
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
    winEl.getBoundingClientRect = () => ({
      left: 6,
      top: 8,
      right: 106,
      bottom: 208,
      width: 100,
      height: 200,
      x: 6,
      y: 8,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
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
    winEl.getBoundingClientRect = () => ({
      left: 1500,
      top: 760,
      right: 1600,
      bottom: 860,
      width: 100,
      height: 100,
      x: 1500,
      y: 760,
      toJSON: () => {}
    });

    act(() => {
      ref.current!.handleDrag();
    });
    act(() => {
      ref.current!.handleStop();
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
    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: leftSnapTop,
      right: 105,
      bottom: leftSnapTop + 100,
      width: 100,
      height: 100,
      x: 5,
      y: leftSnapTop,
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

  it('keeps maximized windows within the desktop padding when navbar height is under-reported', () => {
    measureWindowTopOffsetMock.mockReturnValue(DESKTOP_TOP_PADDING - 12);

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

    const winEl = document.getElementById('test-window') as HTMLElement | null;
    expect(winEl).not.toBeNull();
    const offsetParent = document.createElement('div');
    Object.defineProperty(offsetParent, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({
        top: DESKTOP_TOP_PADDING,
        left: 0,
        bottom: DESKTOP_TOP_PADDING + 720,
        right: 1280,
        width: 1280,
        height: 720,
      }),
    });
    if (winEl) {
      Object.defineProperty(winEl, 'offsetParent', {
        configurable: true,
        get: () => offsetParent,
      });
    }

    const maximizeButton = screen.getByRole('button', { name: /window maximize/i });
    fireEvent.click(maximizeButton);

    expect(winEl?.style.transform).toBe('translate(-1pt, 0px)');

    if (winEl) {
      delete (winEl as any).offsetParent;
    }
    measureWindowTopOffsetMock.mockReturnValue(DESKTOP_TOP_PADDING);
  });
});

describe('Window keyboard dragging', () => {
  it('moves window using arrow keys with grabbed state', async () => {
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

    const handle = screen.getByText('Test').parentElement!;
    const startPosition = { ...ref.current!.state.position };

    act(() => {
      ref.current!.setState({ grabbed: true });
    });

    expect(handle).toHaveAttribute('aria-grabbed', 'true');

    act(() => {
      ref.current!.handleTitleBarKeyDown({
        key: 'ArrowRight',
        target: handle,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      });
    });

    expect(ref.current!.state.position.x).toBeCloseTo(startPosition.x + 10, 2);
    expect(ref.current!.state.position.y).toBeCloseTo(startPosition.y, 1);
    const winEl = document.getElementById('test-window')!;
    expect(winEl.style.transform).toBe(
      `translate(${ref.current!.state.position.x}px, ${ref.current!.state.position.y}px)`
    );

    act(() => {
      ref.current!.handleTitleBarKeyDown({
        key: ' ',
        target: handle,
        preventDefault: jest.fn(),
        stopPropagation: jest.fn(),
      });
    });
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
    expect(state.viewportOffset).toEqual({ left: 0, top: 0 });
  });

  it('respects visual viewport offsets when storing transform values', () => {
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
      left: 10,
      top: 10,
      right: 110,
      bottom: 110,
      width: 100,
      height: 100,
      x: 10,
      y: 10,
      toJSON: () => {},
    });

    setVisualViewport(600, 500, 40, 30);

    act(() => {
      window.dispatchEvent(new Event('resize'));
    });

    act(() => {
      ref.current!.setWinowsPosition();
    });

    expect(ref.current!.state.viewportOffset).toEqual({ left: 40, top: 30 });
    const offset = ref.current!.state.viewportOffset;
    const minY = offset.top + ref.current!.state.safeAreaTop;

    expect(parseFloat(winEl.style.getPropertyValue('--window-transform-x'))).toBeCloseTo(offset.left, 1);
    expect(parseFloat(winEl.style.getPropertyValue('--window-transform-y'))).toBeCloseTo(minY, 1);
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
