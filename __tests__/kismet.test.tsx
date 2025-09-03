import React from 'react';
import { render, screen } from '@testing-library/react';
import KismetApp from '../components/apps/kismet';

describe('KismetApp', () => {
  it('renders the placeholder message', () => {
    render(<KismetApp />);
    expect(
      screen.getByText(/kismet app placeholder/i),
    ).toBeInTheDocument();
  });
});
