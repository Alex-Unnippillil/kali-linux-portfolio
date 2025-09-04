import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSEApp from '../components/apps/nmap-nse.jsx';

describe('NmapNSEApp', () => {
  it('shows example output for selected script', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation((url: RequestInfo | URL) =>
        Promise.resolve({
          json: () =>
            Promise.resolve(
              typeof url === 'string' && url.includes('nmap-results')
                ? { hosts: [] }
                : { 'ftp-anon': 'FTP output' }
            ),
        })
      );

    render(<NmapNSEApp />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.click(screen.getByLabelText(/ftp-anon/i));
    expect(await screen.findByText('FTP output')).toBeInTheDocument();

    mockFetch.mockRestore();
  });

  it('copies command to clipboard', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation((url: RequestInfo | URL) =>
        Promise.resolve({
          json: () =>
            Promise.resolve(
              typeof url === 'string' && url.includes('nmap-results')
                ? { hosts: [] }
                : {}
            ),
        })
      );
    const writeText = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(<NmapNSEApp />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());
    await userEvent.click(
      screen.getByRole('button', { name: /copy command/i })
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('nmap')
    );

    mockFetch.mockRestore();
  });

  it('copies example output to clipboard', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation((url: RequestInfo | URL) =>
        Promise.resolve({
          json: () =>
            Promise.resolve(
              typeof url === 'string' && url.includes('nmap-results')
                ? { hosts: [] }
                : { 'http-title': 'Sample output' }
            ),
        })
      );
    const writeText = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(<NmapNSEApp />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.click(
      screen.getByRole('button', { name: /copy output/i })
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Sample output')
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(/copied/i);

    mockFetch.mockRestore();
  });
});
