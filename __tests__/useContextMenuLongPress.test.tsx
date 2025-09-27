import React from 'react';
import { cleanup, fireEvent, render } from '@testing-library/react';
import useContextMenuLongPress from '../hooks/useContextMenuLongPress';

const TestComponent: React.FC<{ delay?: number }> = ({ delay = 50 }) => {
  useContextMenuLongPress({ delay });
  return <div data-testid="pressable" data-context="app">Press me</div>;
};

describe('useContextMenuLongPress', () => {
  beforeAll(() => {
    if (!('PointerEvent' in window)) {
      class PointerEventPolyfill extends MouseEvent {
        pointerId: number;
        pointerType: string;

        constructor(type: string, props: any = {}) {
          super(type, props);
          this.pointerId = props.pointerId ?? 0;
          this.pointerType = props.pointerType ?? 'mouse';
        }
      }

      (window as unknown as { PointerEvent: typeof PointerEvent }).PointerEvent =
        PointerEventPolyfill as unknown as typeof PointerEvent;
    }
  });

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('dispatches contextmenu after a sustained touch press', () => {
    const { getByTestId } = render(<TestComponent />);
    const target = getByTestId('pressable');
    const handler = jest.fn();
    target.addEventListener('contextmenu', handler);

    fireEvent.pointerDown(target, {
      pointerType: 'touch',
      pointerId: 1,
      clientX: 42,
      clientY: 84,
    });

    expect(target).toHaveClass('context-menu-pressing');

    jest.advanceTimersByTime(60);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(target).not.toHaveClass('context-menu-pressing');
  });

  it('cancels when the touch is released before the threshold', () => {
    const { getByTestId } = render(<TestComponent />);
    const target = getByTestId('pressable');
    const handler = jest.fn();
    target.addEventListener('contextmenu', handler);

    fireEvent.pointerDown(target, {
      pointerType: 'touch',
      pointerId: 7,
      clientX: 10,
      clientY: 10,
    });

    expect(target).toHaveClass('context-menu-pressing');

    fireEvent.pointerUp(target, { pointerType: 'touch', pointerId: 7 });

    jest.advanceTimersByTime(60);

    expect(handler).not.toHaveBeenCalled();
    expect(target).not.toHaveClass('context-menu-pressing');
  });

  it('cleans up feedback on pointer cancellation', () => {
    const { getByTestId } = render(<TestComponent />);
    const target = getByTestId('pressable');
    const handler = jest.fn();
    target.addEventListener('contextmenu', handler);

    fireEvent.pointerDown(target, {
      pointerType: 'touch',
      pointerId: 3,
      clientX: 12,
      clientY: 18,
    });

    expect(target).toHaveClass('context-menu-pressing');

    fireEvent.pointerCancel(target, { pointerType: 'touch', pointerId: 3 });

    jest.advanceTimersByTime(60);

    expect(handler).not.toHaveBeenCalled();
    expect(target).not.toHaveClass('context-menu-pressing');
  });
});
