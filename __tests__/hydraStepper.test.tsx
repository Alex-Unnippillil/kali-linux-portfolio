import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Stepper from '../components/apps/hydra/Stepper';

describe('Hydra Stepper', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // @ts-ignore
    window.matchMedia = window.matchMedia || function () {
      return {
        matches: false,
        addListener: () => {},
        removeListener: () => {},
      };
    };
    // @ts-ignore
    window.requestAnimationFrame = (cb: any) => cb();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows backoff indicator and rate info', () => {
    render(
      <Stepper
        active
        totalAttempts={10}
        backoffThreshold={2}
        lockoutThreshold={5}
        runId={1}
      />
    );
    expect(screen.getByTestId('backoff-bar')).toBeInTheDocument();
    expect(screen.getByText(/Delay: 500ms/)).toBeInTheDocument();
    expect(
      screen.getByText(/Concurrency: 1 \| Throughput: 2\.0 attempts\/s/)
    ).toBeInTheDocument();
  });

  it('locks out after reaching threshold', () => {
    render(
      <Stepper
        active
        totalAttempts={10}
        backoffThreshold={2}
        lockoutThreshold={3}
        runId={1}
      />
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      jest.advanceTimersByTime(500);
    });
    act(() => {
      jest.advanceTimersByTime(1000);
    });
    expect(screen.getAllByText(/Locked out/i).length).toBeGreaterThan(0);
  });

  it('reflects higher throughput for additional concurrency', () => {
    render(
      <Stepper
        totalAttempts={20}
        lockoutThreshold={10}
        runId={2}
        concurrency={4}
        baseDelayMs={250}
      />
    );

    expect(
      screen.getByText(/Concurrency: 4 \| Throughput: 16\.0 attempts\/s/)
    ).toBeInTheDocument();
  });
});
