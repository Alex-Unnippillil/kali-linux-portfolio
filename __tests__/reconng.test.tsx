import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReconNG from '../components/apps/reconng';
import { NetworkProfileProvider } from '../hooks/useNetworkProfile';

const renderWithNetwork = (ui: React.ReactElement) =>
  render(<NetworkProfileProvider>{ui}</NetworkProfileProvider>);

describe('ReconNG app', () => {
  const realFetch = global.fetch;
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ modules: ['Port Scan'] }),
      })
    ) as jest.Mock;
  });

  afterEach(() => {
    global.fetch = realFetch;
  });

  it('stores API keys in localStorage', async () => {
    renderWithNetwork(<ReconNG />);
    await userEvent.click(screen.getByText('Settings'));
    const input = screen.getByPlaceholderText('DNS Enumeration API Key');
    await userEvent.type(input, 'abc123');
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('reconng-api-keys') || '{}');
      expect(stored['DNS Enumeration']).toBe('abc123');
    });
  });

  it('hides API keys by default', async () => {
    renderWithNetwork(<ReconNG />);
    await userEvent.click(screen.getByText('Settings'));
    const input = screen.getByPlaceholderText('DNS Enumeration API Key');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('loads marketplace modules', async () => {
    renderWithNetwork(<ReconNG />);
    await userEvent.click(screen.getByText('Marketplace'));
    expect(await screen.findByText('Port Scan')).toBeInTheDocument();
  });

  it('allows tagging scripts', async () => {
    renderWithNetwork(<ReconNG />);
    await userEvent.click(screen.getByText('Marketplace'));
    const input = await screen.findByPlaceholderText('Tag Port Scan');
    await userEvent.type(input, 'network{enter}');
    expect(await screen.findByText('network')).toBeInTheDocument();
    await waitFor(() => {
      const stored = JSON.parse(
        localStorage.getItem('reconng-script-tags') || '{}'
      );
      expect(stored['Port Scan']).toEqual(['network']);
    });
  });

  it('dedupes entities in table', async () => {
    renderWithNetwork(<ReconNG />);
    const input = screen.getByPlaceholderText('Target');
    await userEvent.type(input, 'example.com');
    await userEvent.click(screen.getAllByText('Run')[1]);
    await screen.findByText('John Doe');
    await userEvent.click(screen.getAllByText('Run')[1]);
    const rows = screen.getAllByText('example.com');
    expect(rows.length).toBe(1);
  });
});
