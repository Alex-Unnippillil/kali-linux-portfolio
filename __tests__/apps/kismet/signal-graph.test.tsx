import React from 'react';
import { act, render } from '@testing-library/react';
import SignalGraph, { SignalGraphHandle } from '../../../apps/kismet/components/SignalGraph';

describe('SignalGraph performance', () => {
  let originalRAF: typeof window.requestAnimationFrame;
  let originalCancel: typeof window.cancelAnimationFrame;
  let rafMock: jest.Mock<number, [FrameRequestCallback]>;
  let realNow: number;

  beforeEach(() => {
    realNow = Date.now();
    jest.useFakeTimers();
    jest.setSystemTime(0);
    originalRAF = window.requestAnimationFrame;
    originalCancel = window.cancelAnimationFrame;
    rafMock = jest.fn((cb: FrameRequestCallback) => {
      const id = window.setTimeout(() => {
        cb(performance.now());
      }, 16);
      return id as unknown as number;
    });
    window.requestAnimationFrame = rafMock;
    window.cancelAnimationFrame = jest.fn((id: number) => {
      clearTimeout(id as unknown as ReturnType<typeof setTimeout>);
    });
  });

  afterEach(() => {
    jest.setSystemTime(realNow);
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
    window.requestAnimationFrame = originalRAF;
    window.cancelAnimationFrame = originalCancel;
  });

  const advanceFrame = () => {
    act(() => {
      jest.advanceTimersByTime(16);
    });
  };

  it('coalesces rapid updates into a single animation frame', () => {
    let handle: SignalGraphHandle | null = null;
    render(
      <SignalGraph
        ref={(instance) => {
          handle = instance;
        }}
        height={120}
      />,
    );

    expect(handle).not.toBeNull();

    act(() => {
      handle!.pushSamples([
        { bssid: 'aa:bb:cc:00:00:01', rssi: -45, timestamp: 0 },
      ]);
      handle!.pushSamples([
        { bssid: 'aa:bb:cc:00:00:01', rssi: -46, timestamp: 10 },
      ]);
      handle!.pushSamples([
        { bssid: 'aa:bb:cc:00:00:01', rssi: -47, timestamp: 20 },
      ]);
    });

    expect(rafMock).toHaveBeenCalledTimes(1);

    advanceFrame();

    act(() => {
      handle!.pushSamples([
        { bssid: 'aa:bb:cc:00:00:01', rssi: -48, timestamp: 30 },
      ]);
    });

    expect(rafMock).toHaveBeenCalledTimes(2);
  });

  it('prunes samples older than the visible duration', () => {
    let handle: SignalGraphHandle | null = null;
    render(
      <SignalGraph
        ref={(instance) => {
          handle = instance;
        }}
        durationMs={60000}
        height={120}
      />,
    );

    expect(handle).not.toBeNull();

    act(() => {
      handle!.pushSample({
        bssid: 'de:ad:be:ef:00:01',
        rssi: -50,
        timestamp: 0,
      });
    });

    advanceFrame();

    act(() => {
      handle!.pushSample({
        bssid: 'de:ad:be:ef:00:01',
        rssi: -55,
        timestamp: 61000,
      });
    });

    advanceFrame();

    const summary = handle!.getSeriesSummary('de:ad:be:ef:00:01');
    expect(summary).toBeDefined();
    expect(summary?.count).toBe(1);
    expect(summary?.oldest).toBe(61000);
    expect(summary?.newest).toBe(61000);
  });
});
