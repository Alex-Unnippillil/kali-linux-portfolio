import React from 'react';
import { render, screen } from '@testing-library/react';
import Toast from '../components/ui/Toast';
import FormError from '../components/ui/FormError';

describe('live region components', () => {
  it('Toast uses assertive live region', () => {
    const { unmount } = render(<Toast message="Saved" />);
    const region = screen.getByRole('alert');
    expect(region).toHaveAttribute('aria-live', 'assertive');
    unmount();
  });

  it('FormError announces politely', () => {
    render(<FormError>Required field</FormError>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
