import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NmapNSEApp from '../components/apps/nmap-nse';

const SAMPLE_RESULTS = {
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
};

const SAMPLE_OUTPUTS = {
  'http-title': 'Sample output',
  'ftp-anon': 'FTP output',
};

const mockFetch = (results = SAMPLE_RESULTS, outputs = SAMPLE_OUTPUTS) =>
  jest
    .spyOn(global, 'fetch')
    .mockImplementation((url: RequestInfo | URL) =>
      Promise.resolve({
        json: () =>
          Promise.resolve(
            typeof url === 'string' && url.includes('nmap-results')
              ? results
              : outputs
          ),
      })
    );

describe('NmapNSEApp', () => {
  it('shows example output for selected script', async () => {
    const fetchSpy = mockFetch({ hosts: [] }, { 'ftp-anon': 'FTP output' });

    render(<NmapNSEApp />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    await userEvent.click(screen.getByLabelText(/ftp-anon/i));
    expect(await screen.findByText('FTP output')).toBeInTheDocument();

    fetchSpy.mockRestore();
  });

  it('copies command to clipboard', async () => {
    const fetchSpy = mockFetch({ hosts: [] }, {});
    const writeText = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(<NmapNSEApp />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());
    await userEvent.click(
      screen.getByRole('button', { name: /copy command/i })
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('nmap')
    );

    fetchSpy.mockRestore();
  });

  it('copies example output to clipboard', async () => {
    const fetchSpy = mockFetch({ hosts: [] }, { 'http-title': 'Sample output' });
    const writeText = jest.fn();
    // @ts-ignore
    navigator.clipboard = { writeText };

    render(<NmapNSEApp />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    await userEvent.click(
      screen.getByRole('button', { name: /copy output/i })
    );
    expect(writeText).toHaveBeenCalledWith(
      expect.stringContaining('Sample output')
    );
    expect(await screen.findByRole('status')).toHaveTextContent(/copied/i);

    fetchSpy.mockRestore();
  });

  it('renders script results with category badges', async () => {
    const fetchSpy = mockFetch(SAMPLE_RESULTS, {});

    render(<NmapNSEApp />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const hostButton = await screen.findByRole('button', { name: '192.0.2.1' });
    const scriptNode = within(hostButton.closest('li') as HTMLElement).getByText(
      'http-title'
    );
    expect(
      within(scriptNode.parentElement as HTMLElement).getByText('discovery')
    ).toBeInTheDocument();

    fetchSpy.mockRestore();
  });

  it('allows toggling result views', async () => {
    const fetchSpy = mockFetch(SAMPLE_RESULTS, SAMPLE_OUTPUTS);

    render(<NmapNSEApp />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const rawTab = screen.getByRole('tab', { name: /raw json/i });
    const pivotTab = screen.getByRole('tab', {
      name: /hosts\/services pivot table/i,
    });

    await userEvent.click(rawTab);
    expect(
      screen.getByText(/"ip": "192\.0\.2\.1"/, { selector: 'pre' })
    ).toBeInTheDocument();

    await userEvent.click(pivotTab);
    expect(
      await screen.findByRole('button', { name: /http on 192.0.2.1/i })
    ).toBeInTheDocument();

    fetchSpy.mockRestore();
  });

  it('retains selected host and service when switching views', async () => {
    const fetchSpy = mockFetch(SAMPLE_RESULTS, SAMPLE_OUTPUTS);

    render(<NmapNSEApp />);
    await waitFor(() => expect(fetchSpy).toHaveBeenCalled());

    const serviceButton = await screen.findByRole('button', {
      name: /http on 192.0.2.1/i,
    });
    await userEvent.click(serviceButton);
    expect(serviceButton).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(
      screen.getByRole('tab', { name: /hosts\/services pivot table/i })
    );

    const pivotCell = await screen.findByRole('button', {
      name: /http on 192.0.2.1/i,
    });
    expect(pivotCell).toHaveAttribute('aria-pressed', 'true');

    await userEvent.click(screen.getByRole('tab', { name: /parsed tree/i }));
    const serviceButtonAgain = await screen.findByRole('button', {
      name: /http on 192.0.2.1/i,
    });
    expect(serviceButtonAgain).toHaveAttribute('aria-pressed', 'true');

    fetchSpy.mockRestore();
  });
});
