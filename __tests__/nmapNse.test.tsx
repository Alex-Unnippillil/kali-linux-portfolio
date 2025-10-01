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

    const hostNode = await screen.findByText('192.0.2.1');
    const scriptNode = within(hostNode.parentElement as HTMLElement).getByText(
      'http-title'
    );
    expect(
      within(scriptNode.parentElement as HTMLElement).getByText('discovery')
    ).toBeInTheDocument();

    mockFetch.mockRestore();
  });

  it('shows drawer metadata for a selected script', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() =>
        Promise.resolve({
          json: () => Promise.resolve({ hosts: [] })
        })
      );

    render(<NmapNSEApp />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.click(screen.getByLabelText(/ftp-anon/i));
    const headings = await screen.findAllByRole('heading', {
      name: /ftp-anon/i
    });
    const drawerHeading = headings.find((heading) => heading.closest('aside')) as
      | HTMLElement
      | undefined;
    expect(drawerHeading).toBeTruthy();
    const drawer = drawerHeading?.closest('aside') as HTMLElement;

    expect(drawer).not.toBeNull();
    expect(
      within(drawer as HTMLElement).getByText(
        /Checks for anonymous FTP access/i
      )
    ).toBeInTheDocument();
    expect(
      within(drawer as HTMLElement).getByText('ftp-anon.maxlist')
    ).toBeInTheDocument();
    expect(
      within(drawer as HTMLElement).getByRole('link', { name: /view docs/i })
    ).toHaveAttribute('href', 'https://nmap.org/book/nse.html');

    mockFetch.mockRestore();
  });

  it('copies script snippet from the drawer', async () => {
    const mockFetch = jest
      .spyOn(global, 'fetch')
      .mockImplementation(() =>
        Promise.resolve({
          json: () => Promise.resolve({ hosts: [] })
        })
      );
    const writeText = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(<NmapNSEApp />);
    await waitFor(() => expect(mockFetch).toHaveBeenCalled());

    await userEvent.click(screen.getByLabelText(/dns-brute/i));
    const copyButton = await screen.findByRole('button', {
      name: /copy script snippet/i
    });
    await userEvent.click(copyButton);

    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('--script dns-brute')
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('dns-brute.threads=10')
    );

    mockFetch.mockRestore();
  });
});
