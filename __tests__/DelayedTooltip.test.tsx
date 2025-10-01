import React from 'react';
import { act, render, screen } from '@testing-library/react';
import DelayedTooltip from '../components/ui/DelayedTooltip';

const originalGetBoundingClientRect = HTMLElement.prototype.getBoundingClientRect;

describe('DelayedTooltip', () => {
  afterEach(() => {
    HTMLElement.prototype.getBoundingClientRect = originalGetBoundingClientRect;
    jest.useRealTimers();
  });

  it('supports touch long-press and constrains tooltip within a 320px viewport', () => {
    jest.useFakeTimers();

    window.innerWidth = 320;
    window.innerHeight = 640;

    const triggerRect = {
      width: 40,
      height: 40,
      top: 100,
      left: 260,
      right: 300,
      bottom: 140,
      x: 260,
      y: 100,
      toJSON: () => ({}),
    } as DOMRect;

    const tooltipRect = {
      width: 320,
      height: 96,
      top: 0,
      left: 0,
      right: 320,
      bottom: 96,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect;

    HTMLElement.prototype.getBoundingClientRect = function getBoundingClientRect(this: HTMLElement): DOMRect {
      if (this.dataset?.testid === 'trigger') {
        return triggerRect;
      }
      if (this.dataset?.delayedTooltipContent === 'true') {
        return tooltipRect;
      }
      return originalGetBoundingClientRect.apply(this);
    };

    const TestContent: React.FC<{ placement?: string; arrowOffset?: number }> = ({
      placement,
      arrowOffset,
    }) => (
      <div
        data-testid="tooltip-props"
        data-placement={placement}
        data-arrow={arrowOffset}
      />
    );

    render(
      <DelayedTooltip delay={0} content={<TestContent />}>
        {({
          ref,
          onPointerDown,
          onPointerUp,
          onPointerLeave,
          onPointerCancel,
        }) => (
          <button
            type="button"
            data-testid="trigger"
            ref={ref}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerLeave}
            onPointerCancel={onPointerCancel}
          >
            Trigger
          </button>
        )}
      </DelayedTooltip>,
    );

    const trigger = screen.getByTestId('trigger');

    act(() => {
      trigger.dispatchEvent(
        new PointerEvent('pointerdown', { pointerType: 'touch', bubbles: true }),
      );
      jest.runAllTimers();
    });

    const tooltipContainer = document.querySelector(
      '[data-delayed-tooltip-content="true"]',
    ) as HTMLElement;

    expect(tooltipContainer.style.left).toBe('8px');
    expect(tooltipContainer.style.top).toBe('148px');

    const tooltipProps = screen.getByTestId('tooltip-props');
    expect(tooltipProps.getAttribute('data-placement')).toBe('bottom');
    expect(Number(tooltipProps.getAttribute('data-arrow'))).toBeCloseTo(272, 3);

    act(() => {
      trigger.dispatchEvent(
        new PointerEvent('pointerup', { pointerType: 'touch', bubbles: true }),
      );
      jest.runAllTimers();
    });

    expect(screen.queryByTestId('tooltip-props')).not.toBeInTheDocument();
  });
});
