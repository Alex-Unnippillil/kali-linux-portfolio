import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import DelayedTooltip from '../components/ui/DelayedTooltip';

const DEFAULT_DELAY = 200;

describe('DelayedTooltip keyboard and pointer interactions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('shows tooltip after the same delay on focus as on hover', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    render(
      <DelayedTooltip content="Tooltip text" delay={DEFAULT_DELAY}>
        {({ ref, ...handlers }) => (
          <button type="button" {...handlers} ref={ref}>
            Trigger
          </button>
        )}
      </DelayedTooltip>,
    );

    const trigger = screen.getByRole('button', { name: 'Trigger' });

    await user.tab();

    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(DEFAULT_DELAY - 1);
    });
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Tooltip text')).toBeInTheDocument();
    });

    await user.keyboard('{Escape}');

    await waitFor(() => {
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
    });

    await user.hover(trigger);
    act(() => {
      jest.advanceTimersByTime(DEFAULT_DELAY - 1);
    });
    expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(screen.getByText('Tooltip text')).toBeInTheDocument();
    });
  });

  it('positions the tooltip relative to the trigger for keyboard and pointer activation', async () => {
    const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
    const triggerRect = {
      width: 120,
      height: 40,
      top: 100,
      left: 200,
      bottom: 140,
      right: 320,
      x: 200,
      y: 100,
      toJSON: () => {},
    } as DOMRect;
    const tooltipRect = {
      width: 80,
      height: 30,
      top: 0,
      left: 0,
      bottom: 30,
      right: 80,
      x: 0,
      y: 0,
      toJSON: () => {},
    } as DOMRect;

    const originalDivRect = HTMLDivElement.prototype.getBoundingClientRect;
    HTMLDivElement.prototype.getBoundingClientRect = jest
      .fn()
      .mockReturnValue(tooltipRect);

    try {
      render(
        <DelayedTooltip content="Tooltip text" delay={DEFAULT_DELAY}>
          {({ ref, ...handlers }) => (
            <button type="button" {...handlers} ref={ref}>
              Trigger
            </button>
          )}
        </DelayedTooltip>,
      );

      const trigger = screen.getByRole('button', { name: 'Trigger' });

      Object.defineProperty(trigger, 'getBoundingClientRect', {
        configurable: true,
        value: () => triggerRect,
      });

      await user.tab();
      act(() => {
        jest.advanceTimersByTime(DEFAULT_DELAY);
      });

      const tooltipFromFocus = await screen.findByText('Tooltip text');

      expect(tooltipFromFocus.style.top).toBe(`${triggerRect.bottom + 8}px`);
      expect(tooltipFromFocus.style.left).toBe(
        `${triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2}px`,
      );

      await user.keyboard('{Escape}');
      await waitFor(() => {
        expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
      });

      await user.hover(trigger);
      act(() => {
        jest.advanceTimersByTime(DEFAULT_DELAY);
      });

      const tooltipFromHover = await screen.findByText('Tooltip text');

      expect(tooltipFromHover.style.top).toBe(`${triggerRect.bottom + 8}px`);
      expect(tooltipFromHover.style.left).toBe(
        `${triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2}px`,
      );
    } finally {
      HTMLDivElement.prototype.getBoundingClientRect = originalDivRect;
    }
  });
});
