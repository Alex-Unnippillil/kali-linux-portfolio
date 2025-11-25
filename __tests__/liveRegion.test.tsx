import React from 'react';
import { act, render, screen } from '@testing-library/react';
import Toast from '../components/ui/Toast';
import FormError from '../components/ui/FormError';

describe('live region components', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    document.getElementById('live-region')?.remove();
    const region = document.createElement('div');
    region.id = 'live-region';
    document.body.appendChild(region);
  });

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers();
    });
    jest.useRealTimers();
    document.getElementById('live-region')?.remove();
  });

  it('Toast defaults to status role with aria-live disabled', () => {
    const { unmount } = render(<Toast message="Saved" />);
    const region = screen
      .getAllByRole('status')
      .find((el) => el.getAttribute('data-tone') === 'info');
    expect(region).toBeTruthy();
    expect(region).toHaveAttribute('aria-live', 'off');
    unmount();
  });

  it('Toast announces through the FND-01 helper exactly once', () => {
    const { rerender, unmount } = render(<Toast message="Saved" />);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    const liveRegion = document.getElementById('live-region');
    expect(liveRegion?.textContent).toBe('Saved');

    rerender(<Toast message="Saved" />);
    act(() => {
      jest.advanceTimersByTime(50);
    });
    expect(liveRegion?.textContent).toBe('Saved');
    unmount();
  });

  it('Toast uses alert role for error tone', () => {
    render(<Toast message="Error" tone="error" />);
    const [alert] = screen
      .getAllByRole('alert')
      .filter((el) => el.getAttribute('data-tone') === 'error');
    expect(alert).toHaveAttribute('aria-live', 'off');
  });

  it('FormError announces politely', () => {
    render(<FormError>Required field</FormError>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
