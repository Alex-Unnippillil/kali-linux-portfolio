import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BetaBadge from '../components/util-components/BetaBadge';
import { LabModeProvider } from '../components/util-components/LabMode';

describe('BetaBadge', () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_SHOW_BETA = '1';
    delete process.env.NEXT_PUBLIC_BETA_TOOLTIP;
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('is focusable via keyboard', async () => {
    process.env.NEXT_PUBLIC_BETA_TOOLTIP = 'Preview release';
    render(
      <LabModeProvider>
        <BetaBadge />
      </LabModeProvider>,
    );
    const button = screen.getByRole('button', { name: /beta/i });
    await userEvent.tab();
    expect(button).toHaveFocus();
  });

  test('hides when flag disabled', () => {
    process.env.NEXT_PUBLIC_SHOW_BETA = '0';
    render(
      <LabModeProvider>
        <BetaBadge />
      </LabModeProvider>,
    );
    expect(screen.queryByRole('button', { name: /beta/i })).toBeNull();
  });

  test('shows tooltip content when flag enabled', async () => {
    process.env.NEXT_PUBLIC_BETA_TOOLTIP = 'Lab preview';
    render(
      <LabModeProvider>
        <BetaBadge />
      </LabModeProvider>,
    );
    const button = screen.getByRole('button', { name: /beta/i });
    await userEvent.hover(button);
    expect(await screen.findByText(/lab preview/i)).toBeInTheDocument();
  });
});
