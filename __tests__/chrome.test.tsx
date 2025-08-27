import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import Chrome from '../components/apps/chrome';

// Mock analytics to avoid noise in tests
jest.mock('react-ga4', () => ({ event: jest.fn() }));

describe('Chrome app', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.useFakeTimers();
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
  });

  it('shows offline banner when navigator is offline', () => {
    Object.defineProperty(window.navigator, 'onLine', {
      value: false,
      configurable: true,
    });

    render(<Chrome />);
    expect(screen.getByTestId('offline-banner')).toBeInTheDocument();

    Object.defineProperty(window.navigator, 'onLine', {
      value: true,
      configurable: true,
    });
  });

  it('shows error banner after load timeout', () => {
    render(<Chrome />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
    act(() => {
      jest.advanceTimersByTime(10000);
    });
    expect(screen.getByTestId('error-banner')).toHaveTextContent('Timed out');
  });

  it('persists tabs across sessions', () => {
    const { unmount } = render(<Chrome />);
    fireEvent.click(screen.getByTestId('add-tab'));
    expect(JSON.parse(localStorage.getItem('chrome-tabs') || '[]')).toHaveLength(2);

    // Re-render to simulate new session
    unmount();
    render(<Chrome />);
    const tabs = screen.getAllByTestId('tab');
    expect(tabs.length).toBe(2);
  });
});
