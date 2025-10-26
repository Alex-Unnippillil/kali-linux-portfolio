import React from 'react';
import { render, act } from '@testing-library/react';
import GameLayout from '../components/apps/GameLayout';

function flushFrames(queue: FrameRequestCallback[], limit = queue.length) {
  let count = 0;
  while (queue.length && count < limit) {
    const cb = queue.shift();
    if (cb) {
      cb(performance.now());
    }
    count += 1;
  }
}

describe('GameLayout theme runtime', () => {
  test('pauses animation frames when window loses focus', async () => {
    const callbacks: FrameRequestCallback[] = [];
    const originalRaf = window.requestAnimationFrame;
    const originalCancel = window.cancelAnimationFrame;
    const rafMock = jest.fn((cb: FrameRequestCallback) => {
      callbacks.push(cb);
      return callbacks.length;
    });
    const cancelMock = jest.fn();
    window.requestAnimationFrame = rafMock;
    window.cancelAnimationFrame = cancelMock as unknown as typeof cancelAnimationFrame;

    const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    const originalHasFocus = document.hasFocus;
    document.hasFocus = () => true;

    const { unmount } = render(
      <GameLayout gameId="test">
        <div>game</div>
      </GameLayout>,
    );

    await act(async () => {
      flushFrames(callbacks, 5);
    });

    expect(rafMock).toHaveBeenCalled();

    await act(async () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      document.hasFocus = () => false;
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('blur'));
    });

    const callsBefore = rafMock.mock.calls.length;
    await act(async () => {
      flushFrames(callbacks, 10);
    });

    expect(rafMock.mock.calls.length).toBe(callsBefore);
    expect(callbacks.length).toBe(0);

    unmount();
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancel;
    if (originalVisibility) {
      Object.defineProperty(document, 'visibilityState', originalVisibility);
    }
    document.hasFocus = originalHasFocus;
  });
});
