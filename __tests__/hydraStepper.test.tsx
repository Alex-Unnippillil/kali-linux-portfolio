import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Stepper from '../components/apps/hydra/Stepper';
import { defaultThrottleConfig } from '../components/apps/hydra/ThrottlePanel';

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

  it('shows backoff indicator', () => {
    render(
      <Stepper
        active
        totalAttempts={10}
        backoffThreshold={2}
        lockoutThreshold={5}
        throttleConfig={defaultThrottleConfig}
        runId={1}
      />
    );
    expect(screen.getByTestId('backoff-bar')).toBeInTheDocument();
    expect(screen.getByText(/Delay: 500ms/)).toBeInTheDocument();
  });

  it('locks out after reaching threshold', () => {
    render(
      <Stepper
        active
        totalAttempts={10}
        backoffThreshold={2}
        lockoutThreshold={3}
        throttleConfig={{ ...defaultThrottleConfig, lockoutAfter: 3, throttleAfter: 2 }}
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
});
