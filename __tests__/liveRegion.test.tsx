import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import {
  ToastProvider,
  useSuccessToast,
} from '../components/ui/Toast';
import FormError from '../components/ui/FormError';

function TriggerToast() {
  const success = useSuccessToast();
  useEffect(() => {
    success('Saved');
  }, [success]);
  return null;
}

describe('live region components', () => {
  it('Toast uses polite live region', async () => {
    const { unmount } = render(
      <ToastProvider>
        <TriggerToast />
      </ToastProvider>,
    );
    const region = await screen.findByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
    unmount();
  });

  it('FormError announces politely', () => {
    render(<FormError>Required field</FormError>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
