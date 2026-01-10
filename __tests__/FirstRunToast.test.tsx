import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FirstRunToast, FIRST_RUN_TOAST_STORAGE_KEY } from '../components/ui/Toast';

describe('FirstRunToast', () => {
  beforeEach(() => {
    window.localStorage.removeItem(FIRST_RUN_TOAST_STORAGE_KEY);
  });

  it('renders onboarding tips once and stores dismissal', async () => {
    render(<FirstRunToast />);

    const region = await screen.findByRole('status');
    expect(region).toHaveTextContent(/command palette/i);
    expect(region).toHaveAttribute('aria-live', 'polite');

    const dismiss = screen.getByRole('button', { name: /got it/i });
    fireEvent.click(dismiss);

    await waitFor(() => {
      expect(screen.queryByRole('status')).toBeNull();
    });
    expect(window.localStorage.getItem(FIRST_RUN_TOAST_STORAGE_KEY)).toBe('true');
  });

  it('does not render when dismissal is persisted', () => {
    window.localStorage.setItem(FIRST_RUN_TOAST_STORAGE_KEY, 'true');

    render(<FirstRunToast />);

    expect(screen.queryByRole('status')).toBeNull();
  });
});
