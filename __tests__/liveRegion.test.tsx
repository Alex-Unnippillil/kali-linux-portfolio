import React, { useEffect } from 'react';
import { render, screen } from '@testing-library/react';
import { ToasterProvider, useToast } from '../components/ui/Toaster';
import FormError from '../components/ui/FormError';

const SuccessToastTrigger = () => {
  const { success } = useToast();
  useEffect(() => {
    success('Saved', { duration: 1000 });
  }, [success]);
  return null;
};

const ErrorToastTrigger = () => {
  const { error } = useToast();
  useEffect(() => {
    error('Failed', { duration: 1000 });
  }, [error]);
  return null;
};

describe('live region components', () => {
  it('success toasts use polite live regions', async () => {
    render(
      <ToasterProvider>
        <SuccessToastTrigger />
      </ToasterProvider>,
    );

    const region = await screen.findByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  it('error toasts announce assertively', async () => {
    render(
      <ToasterProvider>
        <ErrorToastTrigger />
      </ToasterProvider>,
    );

    const region = await screen.findByRole('alert');
    expect(region).toHaveAttribute('aria-live', 'assertive');
  });

  it('FormError announces politely', () => {
    render(<FormError>Required field</FormError>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
