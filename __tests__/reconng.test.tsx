import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ReconNG from '../components/apps/reconng';
import { ExperimentsProvider } from '../hooks/useExperiments';

const renderWithReconFlag = (ui: React.ReactNode) =>
  render(
    <ExperimentsProvider loader={async () => ({ 'recon-ng-lab': true })}>
      {ui}
    </ExperimentsProvider>,
  );

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
    renderWithReconFlag(<ReconNG />);
    await userEvent.click(await screen.findByText('Settings'));
    const input = await screen.findByPlaceholderText('DNS Enumeration API Key');
    await userEvent.type(input, 'abc123');
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('reconng-api-keys') || '{}');
      expect(stored['DNS Enumeration']).toBe('abc123');
    });
  });

  it('hides API keys by default', async () => {
    renderWithReconFlag(<ReconNG />);
    await userEvent.click(await screen.findByText('Settings'));
    const input = await screen.findByPlaceholderText('DNS Enumeration API Key');
    expect(input).toHaveAttribute('type', 'password');
  });

  it('loads marketplace modules', async () => {
    renderWithReconFlag(<ReconNG />);
    await userEvent.click(await screen.findByText('Marketplace'));
    expect(await screen.findByText('Port Scan')).toBeInTheDocument();
  });

  it('allows tagging scripts', async () => {
    renderWithReconFlag(<ReconNG />);
    await userEvent.click(await screen.findByText('Marketplace'));
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
    renderWithReconFlag(<ReconNG />);
    const input = await screen.findByPlaceholderText('Target');
    await userEvent.type(input, 'example.com');
    const runButtons = await screen.findAllByText('Run');
    await userEvent.click(runButtons[1]);
    await screen.findByText('John Doe');
    await userEvent.click((await screen.findAllByText('Run'))[1]);
    const rows = screen.getAllByText('example.com');
    expect(rows.length).toBe(1);
  });
});
