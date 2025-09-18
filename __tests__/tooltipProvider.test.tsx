import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { Tooltip, TooltipProvider } from '../components/ui/TooltipProvider';

describe('TooltipProvider focus interactions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows tooltip on focus after the configured delay', () => {
    render(
      <TooltipProvider>
        <Tooltip content="Hello tooltip">
          <button type="button">Trigger</button>
        </Tooltip>
      </TooltipProvider>
    );

    const trigger = screen.getByRole('button', { name: /trigger/i });
    fireEvent.focus(trigger);

    expect(screen.queryByRole('tooltip')).toBeNull();

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByRole('tooltip')).toHaveTextContent('Hello tooltip');
  });

  it('hides tooltip on blur', () => {
    render(
      <TooltipProvider>
        <Tooltip content="Hello tooltip">
          <button type="button">Trigger</button>
        </Tooltip>
      </TooltipProvider>
    );

    const trigger = screen.getByRole('button', { name: /trigger/i });
    fireEvent.focus(trigger);

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByRole('tooltip')).toBeInTheDocument();

    fireEvent.blur(trigger);

    act(() => {
      jest.runOnlyPendingTimers();
    });

    expect(screen.queryByRole('tooltip')).toBeNull();
  });

  it('suppresses focus tooltips when the last input was touch', () => {
    render(
      <TooltipProvider>
        <Tooltip content="Hello tooltip">
          <button type="button">Trigger</button>
        </Tooltip>
      </TooltipProvider>
    );

    const trigger = screen.getByRole('button', { name: /trigger/i });
    const pointerDown = new Event('pointerdown') as PointerEvent;
    (pointerDown as any).pointerType = 'touch';
    window.dispatchEvent(pointerDown);

    fireEvent.focus(trigger);

    act(() => {
      jest.advanceTimersByTime(350);
    });

    expect(screen.queryByRole('tooltip')).toBeNull();
  });
});
