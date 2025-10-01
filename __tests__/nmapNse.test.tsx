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
    expect(await screen.findByRole('status')).toHaveTextContent(/copied/i);

    mockFetch.mockRestore();
  });

  it('renders script results with category badges', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation((url: RequestInfo | URL) =>
        Promise.resolve({
          json: () =>
            Promise.resolve(
              typeof url === 'string' && url.includes('nmap-results')
                ? {
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
                  }
                : {}
            ),
        })
      );

    render(<NmapNSEApp />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const parsedHeading = screen.getByRole('heading', { name: /parsed output/i });
    const parsedList = parsedHeading.nextElementSibling as HTMLElement;
    const hostNode = await within(parsedList).findByText('192.0.2.1');
    const scriptNode = within(hostNode.parentElement as HTMLElement).getByText(
      'http-title'
    );
    expect(
      within(scriptNode.parentElement as HTMLElement).getByText('discovery')
    ).toBeInTheDocument();

    mockFetch.mockRestore();
  });

  it('summarizes host deltas and exports markdown', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation((url: RequestInfo | URL) =>
        Promise.resolve({
          json: () =>
            Promise.resolve(
              typeof url === 'string' && url.includes('nmap-results')
                ? {
                    hosts: [
                      {
                        ip: '203.0.113.10',
                        ports: [
                          { port: 80, state: 'open', service: 'http' },
                          { port: 22, state: 'closed', service: 'ssh' },
                        ],
                      },
                      {
                        ip: '203.0.113.20',
                        ports: [{ port: 443, state: 'open', service: 'https' }],
                      },
                    ],
                    previous: {
                      hosts: [
                        {
                          ip: '203.0.113.10',
                          ports: [{ port: 80, state: 'open', service: 'http' }],
                        },
                        {
                          ip: '203.0.113.30',
                          ports: [
                            { port: 25, state: 'filtered', service: 'smtp' },
                          ],
                        },
                      ],
                    },
                    metadata: {
                      runLabel: 'Today',
                      previousRunLabel: 'Yesterday',
                    },
                  }
                : {}
            ),
        })
      );

    const writeText = jest.fn().mockResolvedValue(undefined);
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(<NmapNSEApp />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    const summary = await screen.findByLabelText('Scan summary');
    const hostsScanned = within(summary).getByText('Hosts scanned');
    expect(hostsScanned.nextElementSibling?.textContent).toBe('2 hosts');
    const newHosts = within(summary).getByText('New hosts');
    expect(newHosts.nextElementSibling?.textContent).toBe('1 host');
    expect(
      within(summary).getAllByText('203.0.113.20')[0]
    ).toBeInTheDocument();
    expect(
      within(summary).getAllByText('203.0.113.30')[0]
    ).toBeInTheDocument();
    expect(within(summary).getByText('open')).toBeInTheDocument();
    expect(within(summary).getAllByText('Δ +1')).toHaveLength(2);
    expect(within(summary).getAllByText('Δ -1')).toHaveLength(1);

    await userEvent.click(
      within(summary).getByRole('button', { name: /export markdown/i })
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('| State | Current | Previous | Delta |')
    );
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining('## New hosts'));
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('203.0.113.20')
    );

    mockFetch.mockRestore();
  });
});
