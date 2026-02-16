import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Blackjack from '../components/apps/blackjack';

const card = (value: string) => ({ suit: '\u2660', value });

describe('Blackjack UI', () => {
  test('keyboard shortcuts do not fire while typing in inputs', () => {
    render(<Blackjack windowMeta={{ isFocused: true }} />);
    const penetrationInput = screen.getByLabelText('Penetration');
    penetrationInput.focus();
    fireEvent.keyDown(penetrationInput, { key: '1' });
    expect(screen.getByText(/Bet: 0/)).toBeInTheDocument();
  });

  test('insurance button only appears when dealer shows an ace', () => {
    const deckWithAce = [card('10'), card('9'), card('A'), card('5')];
    render(<Blackjack testDeck={deckWithAce} windowMeta={{ isFocused: true }} />);
    fireEvent.click(screen.getByLabelText('Add 1 chip'));
    fireEvent.click(screen.getByText('Deal'));
    expect(screen.getByText('Take Insurance')).toBeInTheDocument();
  });

  test('insurance button stays hidden without an ace up', () => {
    const deckWithoutAce = [card('10'), card('9'), card('9'), card('5')];
    render(<Blackjack testDeck={deckWithoutAce} windowMeta={{ isFocused: true }} />);
    fireEvent.click(screen.getByLabelText('Add 1 chip'));
    fireEvent.click(screen.getByText('Deal'));
    expect(screen.queryByText('Take Insurance')).toBeNull();
  });

  test('practice mode hides the running count before submission', () => {
    render(<Blackjack windowMeta={{ isFocused: true }} />);
    fireEvent.click(screen.getByText('Practice Count'));
    expect(screen.getByText('Count hidden until you submit.')).toBeInTheDocument();
    expect(screen.queryByText(/RC:/)).toBeNull();
  });
});
