import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import Blackjack from '../components/apps/blackjack';

describe('blackjack UI smoke', () => {
  test('shows deal controls and allows opening rules', () => {
    render(<Blackjack windowMeta={{ isFocused: true }} />);
    expect(screen.getByText('Deal')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Rules'));
    expect(screen.getByText('Table Rules')).toBeInTheDocument();
  });
});
