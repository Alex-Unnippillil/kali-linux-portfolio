import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('supports creating, validating, and sharing custom port presets', async () => {
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

    await userEvent.click(screen.getByRole('button', { name: /add preset/i }));

    const nameInput = screen.getAllByLabelText(/preset name/i)[0];
    await userEvent.clear(nameInput);
    await userEvent.type(nameInput, 'Web Ports');

    expect(
      screen.getByRole('button', { name: 'Web Ports' })
    ).toBeInTheDocument();

    const portsInput = screen.getAllByLabelText(/preset ports/i)[0];
    await userEvent.clear(portsInput);
    await userEvent.type(portsInput, '22,80,443');

    expect(screen.getByText(/-p 22,80,443/)).toBeInTheDocument();

    await userEvent.type(portsInput, ',80');
    expect(screen.getByText(/Duplicate port 80/i)).toBeInTheDocument();

    await userEvent.clear(portsInput);
    await userEvent.type(portsInput, '1000-1002');
    expect(screen.queryByText(/Duplicate port/)).not.toBeInTheDocument();
    expect(screen.getByText(/-p 1000-1002/)).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', { name: /export json/i })
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Web Ports')
    );
    const exportPreview = screen.getByLabelText(/Export presets JSON/i);
    expect(exportPreview).toBeInTheDocument();
    expect(exportPreview).toHaveAttribute('readOnly');
    expect(exportPreview.textContent).toContain('1000-1002');

    await userEvent.click(
      screen.getByRole('button', { name: /delete preset/i })
    );
    await waitFor(() =>
      expect(
        screen.queryByRole('button', { name: 'Web Ports' })
      ).not.toBeInTheDocument()
    );

    const importArea = screen.getByLabelText(/Import presets JSON/i);
    await userEvent.clear(importArea);
    fireEvent.change(importArea, {
      target: { value: '[{"name":"API","ports":"3000,3001"}]' },
    });
    await userEvent.click(screen.getByRole('button', { name: /import json/i }));
    expect(
      await screen.findByRole('button', { name: 'API' })
    ).toBeInTheDocument();

    mockFetch.mockRestore();
  });
});
