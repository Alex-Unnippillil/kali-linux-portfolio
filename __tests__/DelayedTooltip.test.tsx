import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import DelayedTooltip from '../components/ui/DelayedTooltip';

const getTrigger = () => screen.getByTestId('tooltip-trigger');

const stubCoarsePointer = () => {
  const originalMatchMedia = window.matchMedia;
  const originalMaxTouchPoints = navigator.maxTouchPoints;
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query === '(pointer: coarse)',
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
  Object.defineProperty(navigator, 'maxTouchPoints', {
    configurable: true,
    value: 1,
  });
  return () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
    Object.defineProperty(navigator, 'maxTouchPoints', {
      configurable: true,
      value: originalMaxTouchPoints,
    });
  };
};

describe('DelayedTooltip', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  const renderTooltip = () =>
    render(
      <DelayedTooltip content={<span>Info</span>}>
        {({
          ref,
          onPointerEnter,
          onPointerLeave,
          onPointerCancel,
          onPointerDown,
          onFocus,
          onBlur,
          dismiss,
        }) => (
          <button
            type="button"
            ref={ref}
            data-testid="tooltip-trigger"
            onPointerEnter={onPointerEnter}
            onPointerLeave={onPointerLeave}
            onPointerCancel={onPointerCancel}
            onPointerDown={onPointerDown}
            onFocus={onFocus}
            onBlur={onBlur}
            onClick={dismiss}
          >
            Trigger
          </button>
        )}
      </DelayedTooltip>,
    );

  test('uses the base delay for mouse pointers', () => {
    renderTooltip();
    const trigger = getTrigger();

    act(() => {
      fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    });

    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(screen.queryByText('Info')).not.toBeInTheDocument();

    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(screen.getByText('Info')).toBeInTheDocument();

    act(() => {
      fireEvent.pointerLeave(trigger);
    });
  });

  test('extends the delay for touch pointers', () => {
    const restore = stubCoarsePointer();
    try {
      renderTooltip();
      const trigger = getTrigger();

      act(() => {
        fireEvent.pointerEnter(trigger, { pointerType: 'touch' });
      });

      act(() => {
        jest.advanceTimersByTime(699);
      });
      expect(screen.queryByText('Info')).not.toBeInTheDocument();

      act(() => {
        jest.advanceTimersByTime(1);
      });
      expect(screen.getByText('Info')).toBeInTheDocument();

      act(() => {
        fireEvent.pointerLeave(trigger);
      });
    } finally {
      restore();
    }
  });

  test('cancels pending display when a scroll occurs', () => {
    renderTooltip();
    const trigger = getTrigger();

    act(() => {
      fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    });

    act(() => {
      fireEvent.scroll(window);
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Info')).not.toBeInTheDocument();
  });

  test('cancels timers when pointer is cancelled', () => {
    renderTooltip();
    const trigger = getTrigger();

    act(() => {
      fireEvent.pointerEnter(trigger, { pointerType: 'touch' });
    });

    act(() => {
      fireEvent.pointerCancel(trigger, { pointerType: 'touch' });
    });

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(screen.queryByText('Info')).not.toBeInTheDocument();
  });

  test('dismiss function hides the tooltip programmatically', () => {
    let dismissFn: (() => void) | null = null;

    render(
      <DelayedTooltip content={<span>Info</span>}>
        {(props) => {
          dismissFn = props.dismiss;
          return (
            <button
              type="button"
              ref={props.ref}
              data-testid="tooltip-trigger"
              onPointerEnter={props.onPointerEnter}
              onPointerLeave={props.onPointerLeave}
              onPointerCancel={props.onPointerCancel}
              onPointerDown={props.onPointerDown}
              onFocus={props.onFocus}
              onBlur={props.onBlur}
            >
              Trigger
            </button>
          );
        }}
      </DelayedTooltip>,
    );

    const trigger = getTrigger();

    act(() => {
      fireEvent.pointerEnter(trigger, { pointerType: 'mouse' });
    });

    act(() => {
      jest.advanceTimersByTime(300);
    });

    expect(screen.getByText('Info')).toBeInTheDocument();

    act(() => {
      dismissFn?.();
    });

    expect(screen.queryByText('Info')).not.toBeInTheDocument();
  });
});

