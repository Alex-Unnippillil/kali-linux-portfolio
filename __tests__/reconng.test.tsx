import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReconNG from '../components/apps/reconng';

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

  it('stores API keys securely', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Settings'));
    const passphraseInput = screen.getByPlaceholderText('Passphrase');
    await userEvent.type(passphraseInput, 'secret');
    const unlockButton = screen.getByRole('button', { name: /create passphrase/i });
    await userEvent.click(unlockButton);
    await waitFor(() => expect(unlockButton).toBeDisabled());
    const input = screen.getByPlaceholderText('DNS Enumeration API Key');
    await waitFor(() => expect(input).not.toBeDisabled());
    await userEvent.type(input, 'abc123');
    await waitFor(() => {
      const raw = localStorage.getItem('reconng-api-keys');
      expect(raw).toBeTruthy();
      if (!raw) throw new Error('No stored data');
      const envelope = JSON.parse(raw);
      expect(envelope.algorithm).toBeDefined();
      expect(envelope.ciphertext).toBeDefined();
      expect(raw).not.toContain('abc123');
    });
  });

  it('hides API keys by default', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Settings'));
    const passphraseInput = screen.getByPlaceholderText('Passphrase');
    await userEvent.type(passphraseInput, 'secret');
    const unlockButton = screen.getByRole('button', { name: /create passphrase/i });
    await userEvent.click(unlockButton);
    await waitFor(() => expect(unlockButton).toBeDisabled());
    const input = screen.getByPlaceholderText('DNS Enumeration API Key');
    await waitFor(() => expect(input).not.toBeDisabled());
    expect(input).toHaveAttribute('type', 'password');
  });

  it('loads marketplace modules', async () => {
    render(<ReconNG />);
    await userEvent.click(screen.getByText('Marketplace'));
    expect(await screen.findByText('Port Scan')).toBeInTheDocument();
  });

  it('allows tagging scripts', async () => {
    render(<ReconNG />);
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
    render(<ReconNG />);
    const input = screen.getByPlaceholderText('Target');
    await userEvent.type(input, 'example.com');
    await userEvent.click(screen.getAllByText('Run')[1]);
    await screen.findByText('John Doe');
    await userEvent.click(screen.getAllByText('Run')[1]);
    const rows = screen.getAllByText('example.com');
    expect(rows.length).toBe(1);
  });
});
