import React, { act } from 'react';
import { render } from '@testing-library/react';
import TrafficChart from '../apps/wireshark/components/TrafficChart';
import type { TrafficAggregate } from '../apps/wireshark/components/trafficTypes';

describe('TrafficChart', () => {
  const sampleData: TrafficAggregate[] = [
    { address: '1.1.1.1', packets: 10, bytes: 5000 },
    { address: '2.2.2.2', packets: 5, bytes: 2000 },
  ];

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('reduces animation ticks by at least 50% when paused', () => {
    const onAnimationFrame = jest.fn();
    const { rerender } = render(
      <TrafficChart
        title="Top Sources"
        data={sampleData}
        paused={false}
        onAnimationFrame={onAnimationFrame}
      />
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });
    const activeTicks = onAnimationFrame.mock.calls.length;
    expect(activeTicks).toBeGreaterThan(0);

    rerender(
      <TrafficChart
        title="Top Sources"
        data={sampleData}
        paused
        onAnimationFrame={onAnimationFrame}
      />
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    const pausedTicks = onAnimationFrame.mock.calls.length - activeTicks;
    const dropRatio = (activeTicks - pausedTicks) / activeTicks;
    expect(dropRatio).toBeGreaterThanOrEqual(0.5);
    expect(pausedTicks).toBe(0);
  });
});
