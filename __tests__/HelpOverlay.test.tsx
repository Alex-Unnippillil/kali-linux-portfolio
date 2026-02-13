import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import HelpOverlay from '../components/apps/HelpOverlay';

describe('HelpOverlay', () => {
  it('returns null when no instructions exist for the game', () => {
    const { container } = render(<HelpOverlay gameId="unknown" onClose={() => {}} />);
    expect(container.firstChild).toBeNull();
  });

  it('renders instructions when available', () => {
    render(<HelpOverlay gameId="2048" onClose={() => {}} />);
    expect(screen.getByText('2048 Help')).toBeInTheDocument();
    expect(
      screen.getByText('Reach the 2048 tile by merging numbers.')
    ).toBeInTheDocument();
    expect(screen.getByText(/up: ArrowUp/i)).toBeInTheDocument();
  });

  it('traps focus while open and restores focus when closed', async () => {
    const user = userEvent.setup();

    const Wrapper = () => {
      const [open, setOpen] = React.useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Outside trigger
          </button>
          {open && (
            <HelpOverlay
              gameId="2048"
              onClose={() => {
                setOpen(false);
              }}
            />
          )}
        </>
      );
    };

    render(<Wrapper />);

    const trigger = screen.getByRole('button', { name: /outside trigger/i });
    trigger.focus();
    expect(trigger).toHaveFocus();

    await user.click(trigger);

    const firstAction = await screen.findByRole('button', { name: 'ArrowUp' });
    expect(firstAction).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'ArrowDown' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'ArrowLeft' })).toHaveFocus();

    await user.tab();
    expect(screen.getByRole('button', { name: 'ArrowRight' })).toHaveFocus();

    await user.tab();
    const closeButton = screen.getByRole('button', { name: /close/i });
    expect(closeButton).toHaveFocus();

    await user.tab();
    expect(firstAction).toHaveFocus();

    await user.tab({ shift: true });
    expect(closeButton).toHaveFocus();

    await user.keyboard('{Escape}');

    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
