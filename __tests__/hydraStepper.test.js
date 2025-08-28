import React from 'react';
import { render, screen, act } from '@testing-library/react';
import Stepper from '../components/apps/hydra/Stepper';
import { jsx as _jsx } from "react/jsx-runtime";
describe('Hydra Stepper', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.matchMedia = window.matchMedia || function () {
      return {
        matches: false,
        addListener: () => {},
        removeListener: () => {}
      };
    };
    window.requestAnimationFrame = cb => cb();
  });
  afterEach(() => {
    jest.useRealTimers();
  });
  it('locks out after reaching threshold', () => {
    render(/*#__PURE__*/_jsx(Stepper, {
      active: true,
      totalAttempts: 10,
      backoffThreshold: 2,
      lockoutThreshold: 3,
      runId: 1
    }));
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
