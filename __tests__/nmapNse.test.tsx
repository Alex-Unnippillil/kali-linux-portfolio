import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSEApp from '../components/apps/nmap-nse';

describe('NmapNSEApp', () => {
  it('shows example output for selected script', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation((url: RequestInfo | URL) =>
        Promise.resolve({
          json: () => {
            const href = typeof url === 'string' ? url : url.toString();
            if (href.includes('nmap-results')) {
              return Promise.resolve({ hosts: [] });
            }
            if (href.includes('run-history')) {
              return Promise.resolve({ runs: [] });
            }
            return Promise.resolve({ 'ftp-anon': 'FTP output' });
          },
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
          json: () => {
            const href = typeof url === 'string' ? url : url.toString();
            if (href.includes('nmap-results')) {
              return Promise.resolve({ hosts: [] });
            }
            if (href.includes('run-history')) {
              return Promise.resolve({ runs: [] });
            }
            return Promise.resolve({});
          },
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
          json: () => {
            const href = typeof url === 'string' ? url : url.toString();
            if (href.includes('nmap-results')) {
              return Promise.resolve({ hosts: [] });
            }
            if (href.includes('run-history')) {
              return Promise.resolve({ runs: [] });
            }
            return Promise.resolve({ 'http-title': 'Sample output' });
          },
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
    expect(await screen.findByRole('status')).toHaveTextContent(/copied/i);

    mockFetch.mockRestore();
  });

  it('renders script results with category badges', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation((url: RequestInfo | URL) =>
        Promise.resolve({
          json: () => {
            const href = typeof url === 'string' ? url : url.toString();
            if (href.includes('nmap-results')) {
              return Promise.resolve({
                hosts: [
                  {
                    ip: '192.0.2.1',
                    ports: [
                      {
                        port: 80,
                        service: 'http',
                        cvss: 5,
                        scripts: [
                          {
                            name: 'http-title',
                            output: 'Example Domain',
                          },
                        ],
                      },
                    ],
                  },
                ],
              });
            }
            if (href.includes('run-history')) {
              return Promise.resolve({ runs: [] });
            }
            return Promise.resolve({});
          },
        })
      );

    render(<NmapNSEApp />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const hostNode = await screen.findByText('192.0.2.1');
    const scriptNode = within(hostNode.parentElement as HTMLElement).getByText(
      'http-title'
    );
    expect(
      within(scriptNode.parentElement as HTMLElement).getByText('discovery')
    ).toBeInTheDocument();

    mockFetch.mockRestore();
  });
});
