import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import HashcatPage from '../apps/hashcat';

describe('Hashcat page summary panel', () => {
  it('updates the summary when attack mode changes', () => {
    render(<HashcatPage />);

    expect(screen.getByTestId('summary-attack-mode')).toHaveTextContent('Straight');

    fireEvent.click(screen.getByRole('button', { name: /Brute-force/i }));

    expect(screen.getByTestId('summary-attack-mode')).toHaveTextContent('Brute-force');
  });
});
