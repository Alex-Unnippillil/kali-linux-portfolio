import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { ToastProvider, useNotifications } from '../components/ui/ToastProvider';
import FormError from '../components/ui/FormError';

describe('live region components', () => {
  function ToastHarness() {
    const { notify } = useNotifications();
    useEffect(() => {
      void notify({ message: 'Saved', duration: 10000 });
    }, [notify]);
    return null;
  }

  it('Toast uses polite live region', async () => {
    const { unmount } = render(
      <ToastProvider>
        <ToastHarness />
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
