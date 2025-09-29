import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import PopularModules from '../components/util-components/PopularModules';

describe('PopularModules', () => {
  it('filters modules and displays logs and table when selected', async () => {
    render(<PopularModules />);
    fireEvent.click(await screen.findByRole('radio', { name: /scanner/i }));
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: /Brute Force/i })
      ).not.toBeInTheDocument()
    );
    fireEvent.click(screen.getByRole('button', { name: /Port Scanner/i }));
    await waitFor(() =>
      expect(screen.getByRole('log')).toHaveTextContent('Starting port scan')
    );
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

  it('searches modules and builds command preview', async () => {
    render(<PopularModules />);
    const search = await screen.findByPlaceholderText(/search modules/i);
    fireEvent.change(search, { target: { value: 'port' } });
    fireEvent.click(await screen.findByRole('button', { name: /Port Scanner/i }));
    fireEvent.change(screen.getByLabelText('Target'), {
      target: { value: '192.168.0.1' },
    });
    expect(screen.getByTestId('command-preview')).toHaveTextContent(
      'port-scan --target 192.168.0.1'
    );
    await waitFor(() =>
      expect(screen.getByRole('log')).toHaveTextContent('Starting port scan')
    );
  });

  it('filters log output and copies filtered logs', async () => {
    render(<PopularModules />);
    fireEvent.click(await screen.findByRole('button', { name: /Port Scanner/i }));
    const filterInput = await screen.findByPlaceholderText(/filter logs/i);
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

