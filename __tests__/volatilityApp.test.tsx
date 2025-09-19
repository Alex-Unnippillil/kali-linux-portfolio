import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import VolatilityApp from '@/components/apps/volatility';

describe('VolatilityApp demo', () => {
  test('renders process tree and modules from fixture', () => {
    render(<VolatilityApp />);
    expect(screen.getByText(/System \(4\)/i)).toBeInTheDocument();

    fireEvent.click(screen.getByText(/smss\.exe \(248\)/i));
    expect(screen.getByText('0x2000')).toBeInTheDocument();
  });

  test('shows yara heuristics badges', () => {
    render(<VolatilityApp />);
    fireEvent.click(screen.getByText('yarascan'));

    const heuristic = screen.getByText('suspicious');
    expect(heuristic).toHaveClass('bg-yellow-600');
  });
});
