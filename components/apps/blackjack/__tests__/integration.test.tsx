import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import BlackjackApp from '../BlackjackApp';

describe('Blackjack integration', () => {
  test('can deal, act with keyboard, and start new round', () => {
    render(<BlackjackApp windowMeta={{ isFocused: true }} />);

    fireEvent.change(screen.getByLabelText('Bet'), { target: { value: '25' } });
    fireEvent.click(screen.getByText('Deal'));

    fireEvent.keyDown(window, { key: 'h' });
    fireEvent.keyDown(window, { key: 's' });

    fireEvent.keyDown(window, { key: 'n' });
    expect(screen.getByText(/Waiting for next round|Round complete/i)).toBeInTheDocument();
  });
});
