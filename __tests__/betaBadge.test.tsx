import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BetaBadge from '../components/layout/BetaBadge';

describe('BetaBadge', () => {
  test('is focusable via keyboard', async () => {
    process.env.NEXT_PUBLIC_SHOW_BETA = '1';
    render(<BetaBadge />);
    const button = screen.getByRole('button', { name: /beta/i });
    await userEvent.tab();
    expect(button).toHaveFocus();
  });
});
