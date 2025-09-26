import React from 'react';
import { render, screen } from '@testing-library/react';
import Toast from '../components/ui/Toast';
import FormError from '../components/ui/FormError';

describe('live region components', () => {
  it('Toast uses polite live region', () => {
    const { unmount } = render(
      <Toast id="test" message="Saved" onDismiss={() => {}} />,
    );
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
