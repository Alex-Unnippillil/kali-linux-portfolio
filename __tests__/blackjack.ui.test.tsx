import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Blackjack from '../components/apps/blackjack/index';

jest.mock('react-ga4', () => ({ send: jest.fn(), event: jest.fn() }));

const card = (value: string) => ({ suit: '\u2660', value });

const dealHand = async (deck: Array<{ suit: string; value: string }>, bet = 100) => {
  const user = userEvent.setup();
  render(<Blackjack testPresetDeck={deck} />);
  await user.click(screen.getByRole('button', { name: new RegExp(`Add ${bet} chip`, 'i') }));
  await user.click(screen.getByRole('button', { name: 'Deal' }));
  return user;
};

describe('Blackjack UI', () => {
  it('renders the modern blackjack UI', () => {
    render(<Blackjack />);
    expect(screen.getByText('Place your bet')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Deal' })).toBeInTheDocument();
  });

  it('deals a hand and shows action buttons', async () => {
    await dealHand([card('9'), card('7'), card('5'), card('8'), card('2')], 100);
    expect(screen.getByTestId('dealer-hand')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Hit' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Stand' })).toBeInTheDocument();
  });

  it('disables split and prevents keyboard split when not allowed', async () => {
    const user = await dealHand([card('9'), card('7'), card('5'), card('8'), card('2')], 100);
    const splitButton = screen.getByRole('button', { name: 'Split' });
    expect(splitButton).toBeDisabled();
    await user.keyboard('p');
    expect(screen.queryByTestId('player-hand-1')).not.toBeInTheDocument();
  });

  it('shows insurance prompt and gates actions until resolved', async () => {
    const user = await dealHand([card('10'), card('7'), card('A'), card('9'), card('2')], 100);
    expect(screen.getAllByText('Insurance?').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Hit' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Double' })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: 'No Insurance' }));
    expect(screen.getByRole('button', { name: 'Hit' })).toBeEnabled();
  });

  it('auto-resolves blackjack on deal', async () => {
    await dealHand([card('A'), card('K'), card('9'), card('7')], 100);
    expect(screen.getByText('BLACKJACK')).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/Round complete:/)).toBeInTheDocument());
  });
});
