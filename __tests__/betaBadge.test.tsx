import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BetaBadge from '../components/BetaBadge';

describe('BetaBadge', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    delete process.env.NEXT_PUBLIC_FLAG_BETA_BADGE;
    delete process.env.NEXT_PUBLIC_SHOW_BETA;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('is focusable via keyboard', async () => {
    process.env.NEXT_PUBLIC_FLAG_BETA_BADGE = 'true';
    render(<BetaBadge />);
    const button = screen.getByRole('button', { name: /beta/i });
    await userEvent.tab();
    expect(button).toHaveFocus();
  });
});
