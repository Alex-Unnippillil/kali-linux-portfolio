import React from 'react';
import { render, screen } from '@testing-library/react';
import HelpPage from '../pages/help';
import helpCards from '../content/help-cards.json';

describe('HelpCards', () => {
  it('renders command examples using Terminal', () => {
    render(<HelpPage />);

    const terminals = screen.getAllByTestId('xterm-container');
    expect(terminals).toHaveLength(helpCards.length);

    helpCards.forEach((card) => {
      card.commands.forEach((cmd) => {
        expect(
          screen.getByText((content) => content.includes(cmd))
        ).toBeInTheDocument();
      });
    });
  });
});
