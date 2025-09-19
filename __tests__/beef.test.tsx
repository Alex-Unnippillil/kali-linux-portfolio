import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Beef from '../components/apps/beef';

describeFlaky('BeEF app', () => {
  test('advances through lab steps to payload builder', () => {
    render(<Beef />);
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    // move through sandbox, simulated hook and demo module steps
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    fireEvent.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByText(/Payload Builder/i)).toBeInTheDocument();
  });

  test('can reset lab back to disclaimer', () => {
    render(<Beef />);
    fireEvent.click(screen.getByRole('button', { name: /begin/i }));
    // advance to final step
    for (let i = 0; i < 4; i += 1) {
      fireEvent.click(screen.getByRole('button', { name: /next/i }));
    }
    fireEvent.click(screen.getByRole('button', { name: /reset lab/i }));
    expect(screen.getByText(/Disclaimer/i)).toBeInTheDocument();
  });
});
