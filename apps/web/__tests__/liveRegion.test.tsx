import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormError, Toast } from '@unnippillil/ui';

describe('live region components', () => {
  it('Toast uses polite live region', () => {
    const { unmount } = render(<Toast message="Saved" />);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    unmount();
  });

  it('FormError announces politely', () => {
    render(<FormError>Required field</FormError>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
