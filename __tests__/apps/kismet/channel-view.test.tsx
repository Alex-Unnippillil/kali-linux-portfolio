import React from 'react';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import ChannelView, {
  ROTATE_INTERVAL_MS,
  UPDATE_THROTTLE_MS,
} from '@/apps/kismet/components/ChannelView';

type FrameCallback = (time: number) => void;

describe('ChannelView', () => {
  const originalRaf = globalThis.requestAnimationFrame;
  const originalCancelRaf = globalThis.cancelAnimationFrame;
  let callbacks: Map<number, FrameCallback>;
  let currentTime: number;
  let rafId: number;
  let user: ReturnType<typeof userEvent.setup>;

  const getFocusedChannel = () =>
    screen
      .getAllByTestId('channel-wrapper')
      .find((node) => node.getAttribute('data-focused') === 'true')
      ?.getAttribute('data-channel');

  const runAnimationFrame = (step: number) => {
    currentTime += step;
    const pending = Array.from(callbacks.entries());
    callbacks.clear();
    pending.forEach(([, cb]) => cb(currentTime));
  };

  beforeEach(() => {
    jest.useFakeTimers();
    callbacks = new Map();
    currentTime = 0;
    rafId = 0;
    user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });

    (globalThis as typeof globalThis & {
      requestAnimationFrame: (cb: FrameCallback) => number;
    }).requestAnimationFrame = (cb: FrameCallback) => {
      rafId += 1;
      callbacks.set(rafId, cb);
      return rafId;
    };

    (globalThis as typeof globalThis & {
      cancelAnimationFrame: (id: number) => void;
    }).cancelAnimationFrame = (id: number) => {
      callbacks.delete(id);
    };
  });

  afterEach(() => {
    callbacks.clear();
    if (originalRaf) {
      (globalThis as typeof globalThis & {
        requestAnimationFrame: typeof originalRaf;
      }).requestAnimationFrame = originalRaf;
    }
    if (originalCancelRaf) {
      (globalThis as typeof globalThis & {
        cancelAnimationFrame: typeof originalCancelRaf;
      }).cancelAnimationFrame = originalCancelRaf;
    }
    jest.useRealTimers();
  });

  it('renders channel bars and a stop control', () => {
    render(<ChannelView />);

    expect(screen.getByRole('button', { name: /stop/i })).toBeInTheDocument();
    expect(screen.getAllByRole('img', { name: /Channel \d+ activity/ })).toHaveLength(6);
  });

  it('auto rotates the focused channel over time', () => {
    render(<ChannelView />);

    const initialFocus = getFocusedChannel();
    expect(initialFocus).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(ROTATE_INTERVAL_MS + 50);
    });

    expect(getFocusedChannel()).not.toEqual(initialFocus);
  });

  it('throttles animation updates to reduce CPU load', () => {
    render(<ChannelView />);

    const bar = screen.getByTestId('channel-bar-1');
    const initialHeight = bar.getAttribute('style');

    act(() => {
      runAnimationFrame(Math.floor(UPDATE_THROTTLE_MS / 2));
    });

    expect(bar.getAttribute('style')).toBe(initialHeight);

    act(() => {
      runAnimationFrame(UPDATE_THROTTLE_MS + 5);
      runAnimationFrame(UPDATE_THROTTLE_MS + 5);
    });

    expect(bar.getAttribute('style')).not.toBe(initialHeight);
  });

  it('stops animation and rotation when the stop control is used', async () => {
    render(<ChannelView />);

    const initialHeight = screen.getByTestId('channel-bar-1').getAttribute('style');

    act(() => {
      runAnimationFrame(UPDATE_THROTTLE_MS + 5);
      runAnimationFrame(UPDATE_THROTTLE_MS + 5);
    });

    const heightBeforeStop = screen.getByTestId('channel-bar-1').getAttribute('style');
    expect(heightBeforeStop).not.toBe(initialHeight);
    const focusBeforeStop = getFocusedChannel();

    await user.click(screen.getByRole('button', { name: /stop/i }));

    expect(screen.getByRole('button', { name: /resume/i })).toBeInTheDocument();

    const heightAtStop = screen.getByTestId('channel-bar-1').getAttribute('style');
    const focusAtStop = getFocusedChannel();

    act(() => {
      runAnimationFrame(UPDATE_THROTTLE_MS + 5);
    });

    act(() => {
      jest.advanceTimersByTime(ROTATE_INTERVAL_MS * 2);
    });

    const heightAfterStop = screen.getByTestId('channel-bar-1').getAttribute('style');
    const focusAfterStop = getFocusedChannel();

    expect(heightAtStop).toBe(heightBeforeStop);
    expect(heightAtStop).toBe(heightAfterStop);
    expect(focusBeforeStop).toBe(focusAtStop);
    expect(focusAtStop).toBe(focusAfterStop);
  });
});

