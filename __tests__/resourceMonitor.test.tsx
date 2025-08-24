import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import ResourceMonitor from '@components/apps/resource_monitor';

describe('Resource Monitor', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // simple RAF polyfill for timer-based tests
    const raf = (cb: FrameRequestCallback) => setTimeout(() => cb(0), 16);
    (global as any).requestAnimationFrame = raf;
    (global as any).window.requestAnimationFrame = raf;
    (global as any).cancelAnimationFrame = (id: number) => clearTimeout(id);
    (global as any).window.cancelAnimationFrame = (id: number) => clearTimeout(id);
    (global as any).performance.getEntriesByName = () => [];
    (global as any).performance.getEntriesByType = () => [];
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('toggles metrics and clears history', () => {
    render(<ResourceMonitor />);
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // FPS metric visible then toggle off
    expect(screen.getByTestId('metric-fps')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('FPS'));
    expect(screen.queryByTestId('metric-fps')).toBeNull();

    // Clear history resets network metric
    fireEvent.click(screen.getByText('Clear'));
    expect(screen.getByTestId('metric-network')).toHaveTextContent('N/A');
  });
});
