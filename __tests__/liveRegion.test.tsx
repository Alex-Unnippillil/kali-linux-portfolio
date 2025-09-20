import React from 'react';
import { render, screen } from '@testing-library/react';
import Toast from '../components/ui/Toast';
import FormError from '../components/ui/FormError';

describe('live region components', () => {
  it('Toast uses polite live region', () => {
    const { unmount } = render(<Toast message="Saved" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    unmount();
  });

  it('Toast remains visible when duration is null', () => {
    jest.useFakeTimers();
    const onClose = jest.fn();
    const { unmount } = render(<Toast message="Stay" duration={null} onClose={onClose} />);

    try {
      jest.advanceTimersByTime(10_000);
      expect(onClose).not.toHaveBeenCalled();
    } finally {
      unmount();
      jest.useRealTimers();
    }
  });

  it('FormError announces politely', () => {
    render(<FormError>Required field</FormError>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
