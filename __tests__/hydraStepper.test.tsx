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
});
