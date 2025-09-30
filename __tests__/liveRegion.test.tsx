import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Toast from '../components/ui/Toast';
import FormError from '../components/ui/FormError';

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

  it('FormError focuses the first invalid field it describes', async () => {
    render(
      <div>
        <input
          aria-invalid="true"
          aria-describedby="first-error"
          data-testid="first-field"
        />
        <input
          aria-invalid="true"
          aria-describedby="second-error"
          data-testid="second-field"
        />
        <FormError id="first-error">First error</FormError>
        <FormError id="second-error">Second error</FormError>
      </div>
    );

    const firstField = screen.getByTestId('first-field');
    await waitFor(() => expect(document.activeElement).toBe(firstField));
  });
});
