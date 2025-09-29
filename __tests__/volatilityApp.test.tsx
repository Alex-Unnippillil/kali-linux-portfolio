import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import VolatilityApp from '../components/apps/volatility';

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

  test('inspects uploaded sample and surfaces profile insights', async () => {
    render(<VolatilityApp />);

    const sampleInput = screen.getByLabelText(/upload memory sample/i);
    const file = new File(
      [
        'VolatilityHeader\nBuild: 19041\nMajorVersion: 10\nMachine: AMD64\nntoskrnl.exe\n',
      ],
      'win10.raw',
      { type: 'application/octet-stream' }
    );

    fireEvent.change(sampleInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Windows 10 x64/)).toBeInTheDocument();
    });

    expect(screen.getByText(/Confidence:/i)).toBeInTheDocument();
    expect(screen.getByText(/500 ms target/i)).toBeInTheDocument();
  });
});
