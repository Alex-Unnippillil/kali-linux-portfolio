import React from 'react';
import { act, render } from '@testing-library/react';

import PingGraph, {
  MAX_SAMPLES,
  initialPingState,
  pingReducer,
} from '../../../apps/dns-toolkit/components/PingGraph';

describe('pingReducer', () => {
  it('calculates stats and enforces the maximum sample size', () => {
    const sampleA = { timestamp: 0, value: 48 };
    const sampleB = { timestamp: 1, value: null };
    let state = pingReducer(initialPingState, { type: 'add-sample', sample: sampleA });
    expect(state.samples).toHaveLength(1);
    expect(state.stats.min).toBe(48);
    expect(state.stats.max).toBe(48);
    expect(state.stats.avg).toBe(48);
    expect(state.stats.lossRate).toBe(0);

    state = pingReducer(state, { type: 'add-sample', sample: sampleB });
    expect(state.samples).toHaveLength(2);
    expect(state.stats.min).toBe(48);
    expect(state.stats.max).toBe(48);
    expect(state.stats.avg).toBe(48);
    expect(state.stats.lossRate).toBeCloseTo(0.5);

    for (let i = 0; i < MAX_SAMPLES; i += 1) {
      state = pingReducer(state, {
        type: 'add-sample',
        sample: { timestamp: i + 2, value: 60 },
      });
    }

    expect(state.samples).toHaveLength(MAX_SAMPLES);
    expect(state.samples[0].value).toBe(60);
    expect(state.stats.min).toBe(60);
    expect(state.stats.max).toBe(60);
    expect(state.stats.avg).toBe(60);
    expect(state.stats.lossRate).toBe(0);
  });
});

describe('PingGraph visibility behaviour', () => {
  const originalRaf = window.requestAnimationFrame;
  const originalCancel = window.cancelAnimationFrame;
  const originalVisibility = Object.getOwnPropertyDescriptor(document, 'visibilityState');

  let nowSpy: jest.SpyInstance<number, []>;
  let nowValue = 0;
  let visibilityStateValue: DocumentVisibilityState = 'visible';

  beforeEach(() => {
    jest.useFakeTimers();
    nowValue = 0;
    visibilityStateValue = 'visible';
    nowSpy = jest.spyOn(performance, 'now').mockImplementation(() => nowValue);
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibilityStateValue,
    });
    window.requestAnimationFrame = (cb: FrameRequestCallback) => {
      const handle = window.setTimeout(() => {
        nowValue += 16;
        cb(nowValue);
      }, 16);
      return handle;
    };
    window.cancelAnimationFrame = (handle: number) => {
      window.clearTimeout(handle);
    };
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    nowSpy.mockRestore();
    window.requestAnimationFrame = originalRaf;
    window.cancelAnimationFrame = originalCancel;
    if (originalVisibility) {
      Object.defineProperty(document, 'visibilityState', originalVisibility);
    } else {
      delete (document as Partial<Document>).visibilityState;
    }
  });

  it('pauses when hidden and catches up without gaps when visible again', () => {
    const hiddenDuration = 1000;
    const interval = 100;
    let hiddenStartedAt = 0;
    const { getByTestId } = render(
      <PingGraph
        baseLatency={10}
        jitter={0}
        packetLoss={0}
        sampleIntervalMs={interval}
        random={() => 0.5}
      />,
    );

    const getCount = () => Number(getByTestId('ping-count').textContent ?? '0');

    act(() => {
      jest.advanceTimersByTime(800);
    });
    const beforeHide = getCount();
    expect(beforeHide).toBeGreaterThan(0);

    act(() => {
      visibilityStateValue = 'hidden';
      hiddenStartedAt = nowValue;
      document.dispatchEvent(new Event('visibilitychange'));
    });

    act(() => {
      jest.advanceTimersByTime(hiddenDuration);
    });
    expect(getCount()).toBe(beforeHide);

    act(() => {
      visibilityStateValue = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });

    const hiddenElapsed = nowValue - hiddenStartedAt;
    const expectedCatchUp = Math.floor(hiddenElapsed / interval);
    const afterResume = getCount();
    expect(afterResume - beforeHide).toBe(expectedCatchUp);
  });
});
