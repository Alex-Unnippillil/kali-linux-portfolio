import React from 'react';
import { render, screen } from '@testing-library/react';
import Wordlists from '../components/cards/Wordlists';

describe('Wordlists card', () => {
  it('links to the official package page', () => {
    render(<Wordlists />);
    const link = screen.getByRole('link', { name: /official package page/i });
    expect(link).toHaveAttribute('href', 'https://www.kali.org/tools/wordlists/');
  });
});
