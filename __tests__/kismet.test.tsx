import React from 'react';
import { render, screen } from '@testing-library/react';
import KismetApp from '../components/apps/kismet';

describe('KismetApp', () => {
  it('shows placeholder content', () => {
    render(<KismetApp />);
    expect(
      screen.getByText(/Kismet app placeholder/i)
    ).toBeInTheDocument();
  });
});
