import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import ResultViewer from '../components/ResultViewer';

const sampleLogs = [
  { app: 'Metasploit', channel: 'console', level: 'info', message: 'Started job 1' },
  { app: 'Metasploit', channel: 'console', level: 'error', message: 'Failed job 2' },
  { app: 'Nmap', channel: 'scanner', level: 'info', message: 'Scan started' },
  { app: 'Nmap', channel: 'scanner', level: 'warning', message: 'High latency detected' },
  { app: 'Wireshark', channel: 'capture', level: 'info', message: 'Packet captured' },
];

describe('ResultViewer parsed filters', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  const openParsedTab = () => {
    render(<ResultViewer data={sampleLogs} />);
    fireEvent.click(screen.getByRole('tab', { name: /parsed/i }));
  };

  it('filters by app and exposes removable chips', () => {
    openParsedTab();

    expect(screen.getByText('Scan started')).toBeInTheDocument();

    const metasploitToggle = screen.getByRole('button', {
      name: 'Toggle app Metasploit',
    });
    fireEvent.click(metasploitToggle);

    expect(screen.queryByText('Scan started')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Remove filter App: Metasploit' })
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Remove filter App: Metasploit' })
    );

    expect(screen.getByText('Scan started')).toBeInTheDocument();
  });

  it('allows multi-select on channel and level with clear controls', () => {
    openParsedTab();

    const clearButton = screen.getByRole('button', { name: /clear filters/i });
    expect(clearButton).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Toggle channel scanner' }));
    fireEvent.click(screen.getByRole('button', { name: 'Toggle level warning' }));

    expect(clearButton).not.toBeDisabled();
    expect(screen.getByText('High latency detected')).toBeInTheDocument();
    expect(screen.queryByText('Scan started')).not.toBeInTheDocument();
    expect(screen.queryByText('Packet captured')).not.toBeInTheDocument();

    fireEvent.click(clearButton);

    expect(clearButton).toBeDisabled();
    expect(screen.getByText('Packet captured')).toBeInTheDocument();
    expect(screen.getByText('Scan started')).toBeInTheDocument();
  });

  it('applies fuzzy text search scoring and chip removal', () => {
    openParsedTab();

    const searchInput = screen.getByLabelText(/fuzzy search/i);
    fireEvent.change(searchInput, { target: { value: 'fj2' } });

    expect(screen.getByText('Failed job 2')).toBeInTheDocument();
    expect(screen.queryByText('Started job 1')).not.toBeInTheDocument();

    const removeSearch = screen.getByRole('button', {
      name: 'Remove filter Search: fj2',
    });
    fireEvent.click(removeSearch);

    expect(screen.getByText('Started job 1')).toBeInTheDocument();
  });
});

