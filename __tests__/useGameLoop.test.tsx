import React, { FC } from 'react';
import { render, cleanup, act } from '@testing-library/react';
import useGameLoop from '../components/apps/Games/common/useGameLoop';

describe('useGameLoop', () => {
  let rafCallbacks: Map<number, FrameRequestCallback>;
  let nextId: number;
  let visibility: DocumentVisibilityState;

  const TestComponent: FC<{ onTick: (dt: number) => void; running?: boolean }> = ({
    onTick,
    running = true,
  }) => {
    useGameLoop(onTick, running);
    return null;
  };

  beforeAll(() => {
    visibility = 'visible';
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => visibility,
    });
  });

  beforeEach(() => {
    rafCallbacks = new Map();
    nextId = 1;
    visibility = 'visible';
    jest.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
      const id = nextId++;
      rafCallbacks.set(id, cb);
      return id;
    });
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation((id: number) => {
      rafCallbacks.delete(id);
    });
    jest.spyOn(performance, 'now').mockReturnValue(0);
  });

  afterEach(() => {
    cleanup();
    jest.restoreAllMocks();
  });

  it('clamps delta time to 50ms', () => {
    const deltas: number[] = [];
    render(<TestComponent onTick={(dt) => deltas.push(dt)} />);
    expect(rafCallbacks.size).toBeGreaterThan(0);
    act(() => {
      rafCallbacks.get(1)?.(0);
    });
    act(() => {
      rafCallbacks.get(2)?.(200);
    });
    expect(deltas[deltas.length - 1]).toBeCloseTo(0.05, 5);
  });

  it('skips updates while the document is hidden', () => {
    const deltas: number[] = [];
    render(<TestComponent onTick={(dt) => deltas.push(dt)} />);
    act(() => {
      rafCallbacks.get(1)?.(0);
    });
    act(() => {
      visibility = 'hidden';
      rafCallbacks.get(2)?.(32);
    });
    expect(deltas).toEqual([0]);
    act(() => {
      visibility = 'visible';
      rafCallbacks.get(3)?.(64);
    });
    expect(deltas[deltas.length - 1]).toBeCloseTo(0.032, 5);
  });
});
