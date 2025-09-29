import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import DelayedTooltip, {
  calculateTooltipPosition,
} from '../components/ui/DelayedTooltip';

type MatchMediaMock = {
  list: MediaQueryList;
  listeners: Set<(event: MediaQueryListEvent) => void>;
};

const originalMatchMedia = window.matchMedia;

const setupMatchMedia = (matches = false): MatchMediaMock => {
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  const list: MediaQueryList = {
    matches,
    media: '(prefers-reduced-motion: reduce)',
    onchange: null,
    addEventListener: jest.fn((_event, listener) => {
      listeners.add(listener as (event: MediaQueryListEvent) => void);
    }),
    removeEventListener: jest.fn((_event, listener) => {
      listeners.delete(listener as (event: MediaQueryListEvent) => void);
    }),
    addListener: jest.fn((listener) => {
      listeners.add(listener as (event: MediaQueryListEvent) => void);
    }),
    removeListener: jest.fn((listener) => {
      listeners.delete(listener as (event: MediaQueryListEvent) => void);
    }),
    dispatchEvent: jest.fn(),
  };

  window.matchMedia = jest.fn().mockImplementation(() => list);

  return { list, listeners };
};

describe('DelayedTooltip interactions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  test('opens after a 150ms delay and closes immediately', () => {
    setupMatchMedia(false);
    const { getByText, unmount } = render(
      <DelayedTooltip content="Tooltip text">
        {(triggerProps) => (
          <button type="button" {...triggerProps}>
            Trigger
          </button>
        )}
      </DelayedTooltip>,
    );

    const trigger = getByText('Trigger');

    act(() => {
      fireEvent.mouseEnter(trigger);
      jest.advanceTimersByTime(149);
    });

    expect(screen.queryByText('Tooltip text')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    const tooltip = screen.getByText('Tooltip text').closest('[data-placement]');
    expect(tooltip).toBeTruthy();
    const portal = document.querySelector('[data-delayed-tooltip="true"]');
    expect(portal?.contains(tooltip as Node)).toBe(true);

    act(() => {
      fireEvent.mouseLeave(trigger);
    });

    expect(screen.queryByText('Tooltip text')).toBeNull();

    unmount();
  });

  test('respects reduced motion preference and skips delay', () => {
    const { list, listeners } = setupMatchMedia(true);
    const { getByText } = render(
      <DelayedTooltip content="Reduced">
        {(triggerProps) => (
          <button type="button" {...triggerProps}>
            Trigger
          </button>
        )}
      </DelayedTooltip>,
    );

    const trigger = getByText('Trigger');

    act(() => {
      fireEvent.mouseEnter(trigger);
    });

    expect(screen.getByText('Reduced')).toBeInTheDocument();

    act(() => {
      (list as { matches: boolean }).matches = false;
      listeners.forEach((listener) =>
        listener({ matches: false, media: list.media } as MediaQueryListEvent),
      );
    });

    act(() => {
      fireEvent.mouseLeave(trigger);
      fireEvent.mouseEnter(trigger);
      jest.advanceTimersByTime(150);
    });

    expect(screen.getByText('Reduced')).toBeInTheDocument();
  });
});

describe('calculateTooltipPosition', () => {
  const createRect = ({
    top,
    left,
    width,
    height,
  }: {
    top: number;
    left: number;
    width: number;
    height: number;
  }): DOMRect =>
    ({
      top,
      left,
      width,
      height,
      right: left + width,
      bottom: top + height,
      x: left,
      y: top,
      toJSON: () => ({}),
    } as DOMRect);

  const viewportWidth = 800;
  const viewportHeight = 600;

  test('prefers bottom placement when space is available', () => {
    const triggerRect = createRect({ top: 200, left: 200, width: 40, height: 40 });
    const tooltipRect = createRect({ top: 0, left: 0, width: 120, height: 60 });
    const result = calculateTooltipPosition({
      triggerRect,
      tooltipRect,
      viewportWidth,
      viewportHeight,
    });

    expect(result.placement).toBe('bottom');
    expect(result.top).toBe(triggerRect.bottom + 8);
    expect(result.arrowOffset.x).toBeGreaterThanOrEqual(8);
    expect(result.arrowOffset.x).toBeLessThanOrEqual(112);
  });

  test('falls back to top placement near viewport bottom', () => {
    const triggerRect = createRect({ top: 560, left: 300, width: 40, height: 40 });
    const tooltipRect = createRect({ top: 0, left: 0, width: 120, height: 80 });
    const result = calculateTooltipPosition({
      triggerRect,
      tooltipRect,
      viewportWidth,
      viewportHeight,
    });

    expect(result.placement).toBe('top');
    expect(result.top + tooltipRect.height + 8).toBe(triggerRect.top);
    expect(result.arrowOffset.x).toBeGreaterThanOrEqual(8);
  });

  test('uses horizontal placements when vertical space is limited', () => {
    const tooltipRect = createRect({ top: 0, left: 0, width: 180, height: 120 });
    const constrainedHeight = 160;

    const rightTarget = createRect({ top: 60, left: 10, width: 40, height: 40 });
    const rightResult = calculateTooltipPosition({
      triggerRect: rightTarget,
      tooltipRect,
      viewportWidth,
      viewportHeight: constrainedHeight,
    });
    expect(rightResult.placement).toBe('right');
    expect(rightResult.left).toBe(rightTarget.right + 8);
    expect(rightResult.arrowOffset.y).toBeGreaterThanOrEqual(8);
    expect(rightResult.arrowOffset.y).toBeLessThanOrEqual(tooltipRect.height - 8);

    const leftTarget = createRect({ top: 60, left: 760, width: 40, height: 40 });
    const leftResult = calculateTooltipPosition({
      triggerRect: leftTarget,
      tooltipRect,
      viewportWidth,
      viewportHeight: constrainedHeight,
    });
    expect(leftResult.placement).toBe('left');
    expect(leftResult.left + tooltipRect.width + 8).toBe(leftTarget.left);
    expect(leftResult.arrowOffset.y).toBeGreaterThanOrEqual(8);
    expect(leftResult.arrowOffset.y).toBeLessThanOrEqual(tooltipRect.height - 8);
  });

  test('clamps tooltip within viewport and limits arrow offset', () => {
    const triggerRect = createRect({ top: 50, left: 4, width: 40, height: 40 });
    const tooltipRect = createRect({ top: 0, left: 0, width: 220, height: 60 });
    const result = calculateTooltipPosition({
      triggerRect,
      tooltipRect,
      viewportWidth: 240,
      viewportHeight,
    });

    expect(result.left).toBe(8);
    expect(result.arrowOffset.x).toBeGreaterThanOrEqual(8);
    expect(result.arrowOffset.x).toBeLessThanOrEqual(212);
  });
});
