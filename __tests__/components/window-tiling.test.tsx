import React, { act } from 'react';
import { render } from '@testing-library/react';
import Window from '../../components/base/window';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));
jest.mock('react-draggable', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

const baseProps = {
  id: 'tiling-window',
  title: 'Tiling Test',
  screen: () => <div>content</div>,
  focus: () => {},
  hasMinimised: () => {},
  closed: () => {},
  hideSideBar: () => {},
  openApp: () => {},
};

describe('Window quadrant snapping', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 720, writable: true });
  });

  it('previews top-left quadrant when dragged to the corner', () => {
    const ref = React.createRef<Window>();
    render(<Window {...baseProps} ref={ref} />);

    const winEl = document.getElementById('tiling-window');
    expect(winEl).not.toBeNull();
    if (!winEl) return;

    winEl.getBoundingClientRect = () => ({
      left: 5,
      top: 5,
      right: 205,
      bottom: 205,
      width: 200,
      height: 200,
      x: 5,
      y: 5,
      toJSON: () => {},
    } as DOMRect);

    act(() => {
      ref.current?.handleDrag();
    });

    expect(ref.current?.state.snapPosition).toBe('top-left');
  });

  it('identifies bottom snap target near the lower edge', () => {
    const ref = React.createRef<Window>();
    render(<Window {...baseProps} ref={ref} />);

    const winEl = document.getElementById('tiling-window');
    expect(winEl).not.toBeNull();
    if (!winEl) return;

    winEl.getBoundingClientRect = () => ({
      left: 400,
      top: 600,
      right: 600,
      bottom: 710,
      width: 200,
      height: 110,
      x: 400,
      y: 600,
      toJSON: () => {},
    } as DOMRect);

    act(() => {
      ref.current?.handleDrag();
    });

    expect(ref.current?.state.snapPosition).toBe('bottom');
  });
});

describe('Window keyboard tiling shortcuts', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'innerWidth', { value: 1280, writable: true });
    Object.defineProperty(window, 'innerHeight', { value: 720, writable: true });
  });

  it('snaps to the bottom half with Meta+ArrowDown', () => {
    const ref = React.createRef<Window>();
    render(<Window {...baseProps} ref={ref} />);

    const event = {
      key: 'ArrowDown',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as any;

    act(() => {
      ref.current?.handleKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
    expect(ref.current?.state.snapped).toBe('bottom');
    expect(ref.current?.state.height).toBe(50);
  });

  it('promotes a left snap to the top-left quadrant with Meta+ArrowUp', () => {
    const ref = React.createRef<Window>();
    render(<Window {...baseProps} ref={ref} />);

    act(() => {
      ref.current?.snapWindow('left');
    });

    const event = {
      key: 'ArrowUp',
      metaKey: true,
      ctrlKey: false,
      altKey: false,
      preventDefault: jest.fn(),
      stopPropagation: jest.fn(),
    } as any;

    act(() => {
      ref.current?.handleKeyDown(event);
    });

    expect(ref.current?.state.snapped).toBe('top-left');
    expect(ref.current?.state.height).toBe(50);
    expect(ref.current?.state.width).toBe(50);
  });
});
