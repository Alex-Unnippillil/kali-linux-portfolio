import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSE from '../apps/nmap-nse';

const mockScripts = {
  discovery: [
    {
      name: 'http-title',
      description: 'Fetches page titles from HTTP services.',
      example: 'Example output for http-title',
    },
    {
      name: 'ssh-hostkey',
      description: 'Retrieves the SSH host key.',
      example: 'Example output for ssh-hostkey',
    },
  ],
  vuln: [
    {
      name: 'smb-vuln-ms17-010',
      description: 'Detects MS17-010 SMB vulnerabilities.',
      example: 'Example output for smb-vuln-ms17-010',
    },
  ],
};

describe('NmapNSE page script browser', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({
        json: () => Promise.resolve(mockScripts),
      } as unknown as Response);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('filters scripts by category facet instantly', async () => {
    render(<NmapNSE />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    expect(await screen.findByRole('button', { name: /http-title/i })).toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole('button', { name: /filter by vuln/i })
    );

    expect(screen.getByRole('button', { name: /smb-vuln-ms17-010/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /http-title/i })).not.toBeInTheDocument();
  });

  it('shows inline help for the selected script', async () => {
    render(<NmapNSE />);

    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    await userEvent.click(await screen.findByRole('button', { name: /http-title/i }));

    const helpPanel = await screen.findByTestId('script-help-panel');
    expect(helpPanel).toHaveTextContent('Fetches page titles from HTTP services.');
    expect(helpPanel).toHaveTextContent('Example output for http-title');
  });
});

