import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import PopularModules from '../components/PopularModules';

describe('PopularModules', () => {
  it('filters modules and displays logs and table when selected', () => {
    render(<PopularModules />);
    expect(
      screen.getByRole('button', { name: /update modules/i })
    ).toHaveClass('focus-ring');
    fireEvent.click(screen.getByRole('button', { name: 'scanner' }));
    expect(screen.getByRole('button', { name: /Port Scanner/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Brute Force/i })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Port Scanner/i }));
    expect(screen.getByRole('log')).toHaveTextContent('Starting port scan');
    expect(screen.getByRole('table')).toBeInTheDocument();
    expect(
      screen.getByText('Open ports discovered on the target host')
    ).toBeInTheDocument();
    expect(screen.getByText('Target IP or range')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Practice Lab/i })).toHaveAttribute(
      'href',
      expect.stringContaining('tryhackme.com/room/rpnmap')
    );
  });

  it('searches modules and builds command preview', () => {
    render(<PopularModules />);
    const search = screen.getByPlaceholderText(/search modules/i);
    fireEvent.change(search, { target: { value: 'port' } });
    fireEvent.click(screen.getByRole('button', { name: /Port Scanner/i }));
    fireEvent.change(screen.getByLabelText('Target'), {
      target: { value: '192.168.0.1' },
    });
    expect(screen.getByTestId('command-preview')).toHaveTextContent(
      'port-scan --target 192.168.0.1'
    );
    expect(screen.getByRole('log')).toHaveTextContent('Starting port scan');
  });

  it('filters log output and copies filtered logs', () => {
    render(<PopularModules />);
    fireEvent.click(screen.getByRole('button', { name: /Port Scanner/i }));
    const filterInput = screen.getByPlaceholderText(/filter logs/i);
    fireEvent.change(filterInput, { target: { value: 'open' } });
    expect(screen.getByRole('log')).toHaveTextContent('Found open port 22');
    expect(screen.getByRole('log')).not.toHaveTextContent('Starting port scan');
    (navigator as any).clipboard = { writeText: jest.fn() };
    fireEvent.click(screen.getByRole('button', { name: /Copy Logs/i }));
    expect((navigator as any).clipboard.writeText).toHaveBeenCalledWith(
      expect.stringContaining('Found open port 22')
    );
  });
});

