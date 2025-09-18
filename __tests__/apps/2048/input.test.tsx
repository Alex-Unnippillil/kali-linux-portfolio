import { fireEvent, render } from '@testing-library/react';
import React, { useRef } from 'react';
import useInputController, { MOVE_THROTTLE_MS } from '@/apps/2048/inputController';

if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? '';
      this.isPrimary = init.isPrimary ?? true;
    }
  }

  Object.defineProperty(window, 'PointerEvent', {
    configurable: true,
    writable: true,
    value: PointerEventPolyfill,
  });
  if (typeof global !== 'undefined') {
    Object.defineProperty(global, 'PointerEvent', {
      configurable: true,
      writable: true,
      value: PointerEventPolyfill,
    });
  }
}

const dispatchPointerEvent = (node: Element, type: string, init: PointerEventInit) => {
  const event = new window.PointerEvent(type, { bubbles: true, cancelable: true, ...init });
  node.dispatchEvent(event);
};

type HarnessProps = {
  onMove: (direction: string) => void;
  onUndo?: () => void;
  onRestart?: () => void;
  disabled?: boolean;
};

const InputHarness: React.FC<HarnessProps> = ({
  onMove,
  onUndo = () => {},
  onRestart = () => {},
  disabled = false,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);
  useInputController({ containerRef: ref, onMove, onUndo, onRestart, disabled });
  return <div ref={ref} data-testid="input-surface" />;
};

describe('2048 input controller', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-01-01T00:00:00.000Z').getTime());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  it('keeps the movement throttle under 120ms', () => {
    expect(MOVE_THROTTLE_MS).toBeLessThanOrEqual(120);
  });

  it('throttles rapid keyboard moves', () => {
    const onMove = jest.fn();
    const onUndo = jest.fn();
    const onRestart = jest.fn();

    render(<InputHarness onMove={onMove} onUndo={onUndo} onRestart={onRestart} />);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(onMove).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(MOVE_THROTTLE_MS);
    fireEvent.keyDown(window, { key: 'ArrowUp' });

    expect(onMove).toHaveBeenCalledTimes(2);
    expect(onUndo).not.toHaveBeenCalled();
    expect(onRestart).not.toHaveBeenCalled();
  });

  it('throttles swipe gestures', () => {
    const onMove = jest.fn();
    const { getByTestId } = render(
      <InputHarness onMove={onMove} onUndo={() => {}} onRestart={() => {}} />
    );

    const surface = getByTestId('input-surface');

    dispatchPointerEvent(surface, 'pointerdown', { pointerId: 1, clientX: 0, clientY: 0 });
    dispatchPointerEvent(surface, 'pointerup', { pointerId: 1, clientX: 120, clientY: 10 });

    expect(onMove).toHaveBeenCalledTimes(1);

    dispatchPointerEvent(surface, 'pointerdown', { pointerId: 2, clientX: 0, clientY: 0 });
    dispatchPointerEvent(surface, 'pointerup', { pointerId: 2, clientX: -120, clientY: 0 });

    expect(onMove).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(MOVE_THROTTLE_MS);
    dispatchPointerEvent(surface, 'pointerdown', { pointerId: 3, clientX: 0, clientY: 0 });
    dispatchPointerEvent(surface, 'pointerup', { pointerId: 3, clientX: -160, clientY: -5 });

    expect(onMove).toHaveBeenCalledTimes(2);
  });

  it('ignores micro swipes below the threshold', () => {
    const onMove = jest.fn();
    const { getByTestId } = render(
      <InputHarness onMove={onMove} onUndo={() => {}} onRestart={() => {}} />
    );

    const surface = getByTestId('input-surface');

    dispatchPointerEvent(surface, 'pointerdown', { pointerId: 4, clientX: 0, clientY: 0 });
    dispatchPointerEvent(surface, 'pointerup', { pointerId: 4, clientX: 5, clientY: 6 });

    expect(onMove).not.toHaveBeenCalled();
  });
});
