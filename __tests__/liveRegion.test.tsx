import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Toast from '../components/ui/Toast';
import FormError from '../components/ui/FormError';

describe('live region components', () => {
  it('Toast exposes polite live region updates for new notifications', async () => {
    const { rerender, unmount } = render(
      <Toast
        title="Backup finished"
        status="Success"
        message="Archive saved"
        duration={Infinity}
      />,
    );

    const liveRegion = screen.getByTestId('toast-live-region');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion.textContent).toContain('Backup finished');
    expect(liveRegion.textContent).toContain('Success');
    expect(liveRegion.textContent).toContain('Archive saved');

    rerender(
      <Toast
        title="Backup warning"
        status="Warning"
        message="Retry scheduled"
        duration={Infinity}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId('toast-live-region').textContent).toContain(
        'Backup warning',
      );
      expect(screen.getByTestId('toast-live-region').textContent).toContain('Warning');
      expect(screen.getByTestId('toast-live-region').textContent).toContain('Retry scheduled');
    });

    unmount();
  });

  it('FormError announces politely', () => {
    render(<FormError>Required field</FormError>);
    const region = screen.getByRole('status');
    expect(region).toHaveAttribute('aria-live', 'polite');
  });
});
