import React, { act } from 'react';
import { render, screen } from '@testing-library/react';
import Window from '../components/desktop/Window';
import { DESKTOP_TOP_PADDING } from '../utils/uiConstants';
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

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => {
  const React = require('react');
  const MockDraggable = ({ children }) => <div data-testid="draggable-mock">{children}</div>;
  MockDraggable.displayName = 'MockDraggable';
  return {
    __esModule: true,
    default: MockDraggable,
  };
});

const measureSafeAreaInsetMock = measureSafeAreaInset;
const measureWindowTopOffsetMock = measureWindowTopOffset;
const measureSnapBottomInsetMock = measureSnapBottomInset;

const setViewport = (width, height) => {
  Object.defineProperty(window, 'innerWidth', { configurable: true, writable: true, value: width });
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: height });
};

const assignRect = (element, rect) => {
  element.getBoundingClientRect = () => ({
    ...rect,
    toJSON: () => {},
  });
};

describe('SnapEngine edge and corner detection', () => {
  beforeEach(() => {
    setViewport(1920, 1080);
    measureSafeAreaInsetMock.mockReturnValue(0);
    measureWindowTopOffsetMock.mockReturnValue(DESKTOP_TOP_PADDING);
    measureSnapBottomInsetMock.mockReturnValue(DEFAULT_SNAP_BOTTOM_INSET);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const renderWindow = () => {
    const ref = React.createRef();
    render(
      <Window
        id="snap-window"
        title="Snap test"
        screen={() => <div>snap</div>}
        focus={() => {}}
        hasMinimised={() => {}}
        closed={() => {}}
        openApp={() => {}}
        snapEnabled
        ref={ref}
      />,
    );
    return ref;
  };

  const computeAvailableHeight = () => {
    const topInset = measureWindowTopOffsetMock();
    const bottomInset = measureSnapBottomInsetMock();
    const safeBottom = Math.max(0, measureSafeAreaInsetMock('bottom'));
    return window.innerHeight - topInset - bottomInset - safeBottom;
  };

  it('snaps to the left half when dragged near the left edge', () => {
    const ref = renderWindow();
    const winEl = document.getElementById('snap-window');
    expect(winEl).not.toBeNull();

    const topInset = measureWindowTopOffsetMock();
    const availableHeight = computeAvailableHeight();
    assignRect(winEl, {
      left: 6,
      top: topInset + 120,
      right: 206,
      bottom: topInset + 320,
      width: 200,
      height: 200,
      x: 6,
      y: topInset + 120,
    });

    act(() => {
      ref.current.handleDrag();
    });

    expect(ref.current.state.snapPosition).toBe('left');
    expect(ref.current.state.snapPreview).toMatchObject({
      left: 0,
      top: topInset,
      width: window.innerWidth / 2,
      height: availableHeight,
    });

    const preview = screen.getByTestId('snap-preview');
    expect(preview).toHaveStyle(`left: 0px`);
    expect(preview).toHaveStyle(`top: ${topInset}px`);
    expect(preview).toHaveStyle(`width: ${window.innerWidth / 2}px`);
    expect(preview).toHaveStyle(`height: ${availableHeight}px`);
  });

  it('normalizes a top-right drag into the right snap region', () => {
    const ref = renderWindow();
    const winEl = document.getElementById('snap-window');
    expect(winEl).not.toBeNull();

    const topInset = measureWindowTopOffsetMock();
    const availableHeight = computeAvailableHeight();
    assignRect(winEl, {
      left: window.innerWidth - 210,
      top: topInset + 6,
      right: window.innerWidth - 10,
      bottom: topInset + 206,
      width: 200,
      height: 200,
      x: window.innerWidth - 210,
      y: topInset + 6,
    });

    act(() => {
      ref.current.handleDrag();
    });

    expect(ref.current.state.snapPosition).toBe('right');
    expect(ref.current.state.snapPreview).toMatchObject({
      left: window.innerWidth / 2,
      top: topInset,
      width: window.innerWidth / 2,
      height: availableHeight,
    });

    const preview = screen.getByTestId('snap-preview');
    expect(preview).toHaveStyle(`left: ${window.innerWidth / 2}px`);
    expect(preview).toHaveStyle(`top: ${topInset}px`);
    expect(preview).toHaveStyle(`width: ${window.innerWidth / 2}px`);
    expect(preview).toHaveStyle(`height: ${availableHeight}px`);
  });

  it('returns the bottom-left quarter when near bottom and left edges', () => {
    const ref = renderWindow();
    const winEl = document.getElementById('snap-window');
    expect(winEl).not.toBeNull();

    const topInset = measureWindowTopOffsetMock();
    const availableHeight = computeAvailableHeight();
    const halfHeight = availableHeight / 2;
    assignRect(winEl, {
      left: 5,
      top: topInset + availableHeight - 150,
      right: 205,
      bottom: window.innerHeight - 5,
      width: 200,
      height: 200,
      x: 5,
      y: topInset + availableHeight - 150,
    });

    act(() => {
      ref.current.handleDrag();
    });

    expect(ref.current.state.snapPosition).toBe('bottom-left');
    expect(ref.current.state.snapPreview).toMatchObject({
      left: 0,
      top: topInset + halfHeight,
      width: window.innerWidth / 2,
      height: halfHeight,
    });

    const preview = screen.getByTestId('snap-preview');
    expect(preview).toHaveStyle(`left: 0px`);
    expect(preview).toHaveStyle(`top: ${topInset + halfHeight}px`);
    expect(preview).toHaveStyle(`width: ${window.innerWidth / 2}px`);
    expect(preview).toHaveStyle(`height: ${halfHeight}px`);
  });

  it('clears snap state when Alt+ArrowDown is pressed after snapping', () => {
    const ref = renderWindow();
    const winEl = document.getElementById('snap-window');
    expect(winEl).not.toBeNull();

    const topInset = measureWindowTopOffsetMock();
    assignRect(winEl, {
      left: 4,
      top: topInset + 128,
      right: 204,
      bottom: topInset + 328,
      width: 200,
      height: 200,
      x: 4,
      y: topInset + 128,
    });

    act(() => {
      ref.current.handleDrag();
    });
    expect(ref.current.state.snapPosition).toBe('left');

    act(() => {
      ref.current.handleStop();
    });
    expect(ref.current.state.snapped).toBe('left');

    act(() => {
      ref.current.handleKeyDown({
        key: 'ArrowDown',
        altKey: true,
        preventDefault: () => {},
        stopPropagation: () => {},
      });
    });

    expect(ref.current.state.snapped).toBeNull();
    expect(ref.current.state.snapPosition).toBeNull();
    expect(ref.current.state.snapPreview).toBeNull();
    expect(screen.queryByTestId('snap-preview')).toBeNull();
  });
});
