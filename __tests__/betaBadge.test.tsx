import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import BetaBadge from '../components/BetaBadge';

describe('BetaBadge', () => {
  beforeEach(() => {
    localStorage.clear();
    process.env.NEXT_PUBLIC_SHOW_BETA = '1';
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SHOW_BETA;
  });

  it('mounts, dismisses, and persists after dismissal', () => {
    const { unmount } = render(<BetaBadge />);
    expect(screen.getByTestId('beta-badge')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss beta badge/i }));
    expect(screen.queryByTestId('beta-badge')).not.toBeInTheDocument();
    expect(localStorage.getItem('beta-badge-dismissed')).toBe('1');

    unmount();
    render(<BetaBadge />);
    expect(screen.queryByTestId('beta-badge')).not.toBeInTheDocument();
  });
});
