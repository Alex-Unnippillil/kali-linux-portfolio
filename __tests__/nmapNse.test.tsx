import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSEApp from '../components/apps/nmap-nse';
import { parseHostsFile } from '../components/apps/nmap-nse/Aliases';

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

    const hostLabel = await screen.findByText('192.0.2.1');
    const hostContainer = hostLabel.closest('li');
    expect(hostContainer).not.toBeNull();
    expect(
      within(hostContainer as HTMLElement).getByText('http-title')
    ).toBeInTheDocument();
    expect(
      within(hostContainer as HTMLElement).getByText('discovery')
    ).toBeInTheDocument();

    mockFetch.mockRestore();
  });

  it('applies aliases across parsed results and export payload', async () => {
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
                        ip: '192.0.2.40',
                        ports: [
                          {
                            port: 22,
                            service: 'ssh',
                            cvss: 4.2,
                            scripts: [],
                          },
                        ],
                      },
                    ],
                  }
                : {}
            ),
        })
      );

    const writeText = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(<NmapNSEApp />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText(/IP address/i), '192.0.2.40');
    await userEvent.type(screen.getByLabelText(/Host name/i), 'jump-box');
    await userEvent.click(screen.getByRole('button', { name: /add alias/i }));

    const aliasSection = screen.getByText(/Host aliases/i).parentElement;
    expect(aliasSection).not.toBeNull();
    expect(
      within(aliasSection as HTMLElement).getByText('jump-box (192.0.2.40)')
    ).toBeInTheDocument();

    const parsedHeading = screen.getByText('Parsed output');
    const parsedList = parsedHeading.nextElementSibling;
    expect(parsedList).not.toBeNull();
    expect(
      within(parsedList as HTMLElement).getByText('jump-box (192.0.2.40)')
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /copy results json/i })
    );

    expect(writeText).toHaveBeenCalledTimes(1);
    const payload = JSON.parse(writeText.mock.calls[0][0]);
    expect(payload.aliases).toEqual({ '192.0.2.40': 'jump-box' });
    expect(payload.hosts[0].name).toBe('jump-box');

    mockFetch.mockRestore();
  });
});

describe('parseHostsFile', () => {
  it('parses hosts formatted text and reports invalid lines', () => {
    const input = `# comment\n192.0.2.10 web01.example # inline comment\n198.51.100.5 bad_host\n`;
    const { map, errors } = parseHostsFile(input);
    expect(map).toEqual({ '192.0.2.10': 'web01.example' });
    expect(errors).toEqual([3]);
  });
});
